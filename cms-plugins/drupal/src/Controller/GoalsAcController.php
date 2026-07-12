<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Datetime\TimeInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\path_alias\AliasManagerInterface;
use Drupal\Component\Utility\Xss;
use Drupal\goals_ac\Helper\DrupalNonceStore;
use Drupal\goals_ac\Helper\DrupalKeyStore;
use Drupal\goals_ac\Helper\SiteGraph;
use Drupal\goals_ac\Helper\SchemaInject;
use GoalsAC\Shared\HMACAuth;
use GoalsAC\Shared\Idempotency;
use GoalsAC\Shared\Contract;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Controller for goals.ac integration endpoints.
 */
class GoalsAcController extends ControllerBase implements ContainerInjectionInterface {

  /**
   * Constructs a GoalsAcController.
   */
  public function __construct(
    protected DrupalNonceStore $nonceStore,
    protected DrupalKeyStore $keyStore,
    protected SiteGraph $siteGraph,
    protected SchemaInject $schemaInject,
    protected ConfigFactoryInterface $configFactory,
    protected AccountProxyInterface $currentUser,
    protected TimeInterface $time,
    protected EntityTypeManagerInterface $entityTypeManager,
    protected AliasManagerInterface $aliasManager,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('goals_ac.nonce_store'),
      $container->get('goals_ac.key_store'),
      $container->get('goals_ac.site_graph'),
      $container->get('goals_ac.schema_inject'),
      $container->get('config.factory'),
      $container->get('current_user'),
      $container->get('datetime.time'),
      $container->get('entity_type.manager'),
      $container->get('path_alias.manager'),
    );
  }

  /**
   * GET /goals-ac/health — public, no HMAC.
   */
  public function health(): JsonResponse {
    $cms_version = \Drupal::VERSION;

    return new JsonResponse(
      Contract::healthResponse($cms_version, [
        'cms' => 'drupal',
        'endpoints' => [
          'site_graph' => '/goals-ac/site-graph',
          'content'    => '/goals-ac/content',
          'schema'     => '/goals-ac/schema',
        ],
      ])
    );
  }

  /**
   * GET /goals-ac/site-graph — HMAC authenticated.
   */
  public function siteGraph(Request $request): Response|JsonResponse {
    $auth_result = $this->verifyHmac($request, 'GET', '/goals-ac/site-graph');
    if ($auth_result !== TRUE) {
      return $auth_result;
    }

    try {
      $graph = $this->siteGraph->export();
      return new JsonResponse($graph);
    }
    catch (\Exception $e) {
      $this->getLogger('goals_ac')->error('Site graph export failed: @message', [
        '@message' => $e->getMessage(),
      ]);
      return new JsonResponse([
        'error' => 'export_failed',
        'message' => 'Unable to export site graph.',
      ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /goals-ac/content — HMAC authenticated, idempotent.
   */
  public function content(Request $request): Response|JsonResponse {
    $auth_result = $this->verifyHmac($request, 'POST', '/goals-ac/content');
    if ($auth_result !== TRUE) {
      return $auth_result;
    }

    $idempotency_key = $request->headers->get('X-Idempotency-Key', '');
    $cached = Idempotency::check($idempotency_key, $this->keyStore);
    if ($cached !== NULL) {
      return new JsonResponse($cached);
    }

    $body = json_decode($request->getContent(), TRUE);
    if (!is_array($body)) {
      return new JsonResponse([
        'error' => 'invalid_json',
        'message' => 'Request body must be valid JSON.',
      ], Response::HTTP_BAD_REQUEST);
    }

    try {
      $result = $this->publishContent($body);
      Idempotency::store($idempotency_key, $result, $this->keyStore);
      return new JsonResponse($result, Response::HTTP_CREATED);
    }
    catch (\InvalidArgumentException $e) {
      return new JsonResponse([
        'error' => 'validation_error',
        'message' => $e->getMessage(),
      ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
    catch (\Exception $e) {
      $this->getLogger('goals_ac')->error('Content publish failed: @message', [
        '@message' => $e->getMessage(),
      ]);
      return new JsonResponse([
        'error' => 'publish_failed',
        'message' => 'Unable to publish content.',
      ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /goals-ac/schema — HMAC authenticated.
   */
  public function schema(Request $request): Response|JsonResponse {
    $auth_result = $this->verifyHmac($request, 'POST', '/goals-ac/schema');
    if ($auth_result !== TRUE) {
      return $auth_result;
    }

    $body = json_decode($request->getContent(), TRUE);
    if (!is_array($body)) {
      return new JsonResponse([
        'error' => 'invalid_json',
        'message' => 'Request body must be valid JSON.',
      ], Response::HTTP_BAD_REQUEST);
    }

    $json_ld = $body['json_ld'] ?? NULL;
    $llms_txt = $body['llms_txt'] ?? NULL;

    if ($json_ld === NULL && $llms_txt === NULL) {
      return new JsonResponse([
        'error' => 'missing_fields',
        'message' => 'Provide at least one of: json_ld, llms_txt.',
      ], Response::HTTP_BAD_REQUEST);
    }

    try {
      $result = $this->schemaInject->store($json_ld, $llms_txt);
      return new JsonResponse([
        'status' => 'stored',
        'json_ld_stored' => $json_ld !== NULL,
        'llms_txt_stored' => $llms_txt !== NULL,
        'path' => $result['path'] ?? NULL,
      ]);
    }
    catch (\Exception $e) {
      $this->getLogger('goals_ac')->error('Schema store failed: @message', [
        '@message' => $e->getMessage(),
      ]);
      return new JsonResponse([
        'error' => 'schema_store_failed',
        'message' => 'Unable to store schema configuration.',
      ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify HMAC authentication on a request.
   *
   * @return true|\Symfony\Component\HttpFoundation\JsonResponse
   */
  private function verifyHmac(Request $request, string $method, string $path): true|JsonResponse {
    $site_key = $this->configFactory->get('goals_ac.settings')->get('site_key');
    if (empty($site_key)) {
      return new JsonResponse([
        'error' => 'no_key',
        'message' => 'Site key not configured.',
      ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }

    $result = HMACAuth::verify([
      'method'    => $method,
      'path'      => $path,
      'timestamp' => $request->headers->get(HMACAuth::TIMESTAMP_HEADER, ''),
      'nonce'     => $request->headers->get(HMACAuth::NONCE_HEADER, ''),
      'signature' => $request->headers->get(HMACAuth::SIGNATURE_HEADER, ''),
      'body'      => $request->getContent(),
    ], $site_key, $this->nonceStore);

    if ($result === TRUE) {
      return TRUE;
    }

    return new JsonResponse([
      'error' => $result->code,
      'message' => $result->message,
    ], $result->status);
  }

  /**
   * Publish or update content from the goals.ac payload.
   *
   * @param array $payload The content payload from the SaaS platform.
   * @return array Result with node UUID and status.
   *
   * @throws \InvalidArgumentException
   * @throws \Exception
   */
  private function publishContent(array $payload): array {
    $title = Xss::filterAdmin((string) ($payload['title'] ?? ''));
    $body_value = Xss::filterAdmin((string) ($payload['content'] ?? ''));
    $status = $payload['status'] ?? 'draft';
    $slug = $payload['slug'] ?? '';
    $update_id = $payload['update_id'] ?? NULL;

    if (empty($title)) {
      throw new \InvalidArgumentException('title is required.');
    }

    $content_type = $this->configFactory->get('goals_ac.settings')->get('target_content_type') ?? 'article';
    $entity_type_id = 'node';
    $bundle = $content_type;

    $storage = $this->entityTypeManager->getStorage($entity_type_id);

    $node = NULL;

    // Try to find an existing node by update_id (UUID) first.
    if (!empty($update_id)) {
      $nodes = $storage->loadByProperties(['uuid' => $update_id]);
      $node = $nodes ? reset($nodes) : NULL;
    }

    // Fallback: find by slug (path alias) if available.
    if ($node === NULL && !empty($slug)) {
      $alias = '/' . ltrim($slug, '/');
      $system_path = $this->aliasManager->getPathByAlias($alias);
      if (str_starts_with($system_path, 'node/')) {
        $nid = (int) str_replace('node/', '', $system_path);
        $node = $storage->load($nid);
      }
    }

    $is_new = ($node === NULL);

    if ($is_new) {
      $node = $storage->create([
        'type' => $bundle,
        'title' => $title,
        'status' => $status === 'publish' ? 1 : 0,
      ]);
    }
    else {
      $node->set('title', $title);
      $node->set('status', $status === 'publish' ? 1 : 0);
    }

    // Set body field.
    if (!empty($body_value)) {
      $node->set('body', [
        'value' => $body_value,
        'format' => 'basic_html',
      ]);
    }

    // Set path alias from slug.
    if (!empty($slug)) {
      $node->set('path', ['alias' => '/' . ltrim($slug, '/')]);
    }

    // Handle taxonomy terms (categories and tags).
    $this->assignTerms($node, $payload);

    $node->save();

    $nid = $node->id();
    $uuid = $node->uuid();

    return [
      'status' => $is_new ? 'created' : 'updated',
      'node_id' => $nid,
      'uuid' => $uuid,
      'title' => $node->getTitle(),
      'url' => $node->toUrl()->toString(),
    ];
  }

  /**
   * Assign taxonomy terms to a node from the payload.
   */
  private function assignTerms($node, array $payload): void {
    $vocabularies = [
      'categories' => 'category',
      'tags' => 'tags',
    ];

    foreach ($vocabularies as $field_name => $vid) {
      $terms_input = $payload[$field_name] ?? [];
      if (empty($terms_input) || !is_array($terms_input)) {
        continue;
      }

      $target_ids = [];
      foreach ($terms_input as $term_name) {
        if (is_array($term_name)) {
          $term_name = $term_name['name'] ?? $term_name['title'] ?? '';
        }
        if (empty($term_name)) {
          continue;
        }

        $existing = $this->entityTypeManager
          ->getStorage('taxonomy_term')
          ->loadByProperties(['name' => Xss::filterAdmin((string) $term_name), 'vid' => $vid]);

        if ($existing) {
          $term = reset($existing);
        }
        else {
          $term = $this->entityTypeManager
            ->getStorage('taxonomy_term')
            ->create([
              'vid' => $vid,
              'name' => Xss::filterAdmin((string) $term_name),
            ]);
          $term->save();
        }

        $target_ids[] = $term->id();
      }

      if (!empty($target_ids)) {
        $node->set($field_name, $target_ids);
      }
    }
  }

}
