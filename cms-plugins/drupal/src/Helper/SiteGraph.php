<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Helper;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Config\ConfigFactoryInterface;

/**
 * Exports the Drupal site graph: nodes, taxonomy terms, and internal links.
 *
 * Produces a JSON structure compatible with the goals.ac SaaS platform:
 * - nodes: published content with UUID, title, path, body summary, metadata
 * - taxonomy: terms grouped by vocabulary
 * - links: internal link relationships between nodes
 */
class SiteGraph {

  /**
   * Constructs a SiteGraph.
   */
  public function __construct(
    protected EntityTypeManagerInterface $entityTypeManager,
    protected AccountProxyInterface $currentUser,
    protected ConfigFactoryInterface $configFactory,
  ) {}

  /**
   * Export the full site graph.
   */
  public function export(): array {
    $config = $this->configFactory->get('goals_ac.settings');
    $allowed_types = $config->get('allowed_content_types') ?? ['article', 'page'];

    return [
      'version' => '0.1.0',
      'exported_at' => date('c'),
      'nodes' => $this->exportNodes($allowed_types),
      'taxonomy' => $this->exportTaxonomy(),
      'links' => $this->exportInternalLinks($allowed_types),
    ];
  }

  /**
   * Export published nodes of allowed content types.
   */
  private function exportNodes(array $allowed_types): array {
    $nodes = [];

    $storage = $this->entityTypeManager->getStorage('node');
    $query = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('status', 1)
      ->condition('type', $allowed_types, 'IN')
      ->sort('created', 'DESC')
      ->range(0, 500);

    $entity_ids = $query->execute();
    if (empty($entity_ids)) {
      return $nodes;
    }

    $entities = $storage->loadMultiple($entity_ids);

    foreach ($entities as $entity) {
      $node_data = [
        'uuid' => $entity->uuid(),
        'nid' => $entity->id(),
        'type' => $entity->bundle(),
        'title' => $entity->getTitle(),
        'status' => $entity->isPublished() ? 'published' : 'draft',
        'created' => $entity->getCreatedTime(),
        'changed' => $entity->getChangedTime(),
        'path' => $entity->toUrl()->toString(),
        'langcode' => $entity->language()->getId(),
      ];

      // Body field (summary).
      if ($entity->hasField('body') && !$entity->get('body')->isEmpty()) {
        $body = $entity->get('body');
        $node_data['body'] = [
          'value' => $body->value ?? '',
          'summary' => $body->summary ?? '',
          'format' => $body->format ?? 'full_html',
        ];
      }

      // Featured image (field_media_image or field_image).
      foreach (['field_media_image', 'field_image', 'field_featured_image'] as $image_field) {
        if ($entity->hasField($image_field) && !$entity->get($image_field)->isEmpty()) {
          $image_item = $entity->get($image_field);
          if ($image_item->entity) {
            $file = $image_item->entity;
            $node_data['featured_image'] = [
              'uri' => $file->getFileUri(),
              'url' => \Drupal::service('file_url_generator')->generateAbsoluteString($file->getFileUri()),
              'alt' => $image_item->alt ?? '',
            ];
          }
          break;
        }
      }

      // Taxonomy term references.
      foreach (['field_category', 'field_categories', 'field_tags', 'field_topic'] as $term_field) {
        if ($entity->hasField($term_field) && !$entity->get($term_field)->isEmpty()) {
          $field_name = str_replace('field_', '', $term_field);
          $node_data['terms'][$field_name] = [];
          foreach ($entity->get($term_field) as $item) {
            if ($item->entity) {
              $node_data['terms'][$field_name][] = [
                'tid' => $item->entity->id(),
                'name' => $item->entity->getName(),
                'vid' => $item->entity->bundle(),
              ];
            }
          }
        }
      }

      $nodes[] = $node_data;
    }

    return $nodes;
  }

  /**
   * Export taxonomy terms grouped by vocabulary.
   */
  private function exportTaxonomy(): array {
    $taxonomy = [];
    $vocabulary_storage = $this->entityTypeManager->getStorage('taxonomy_vocabulary');
    $term_storage = $this->entityTypeManager->getStorage('taxonomy_term');

    $vocabularies = $vocabulary_storage->loadMultiple();

    foreach ($vocabularies as $vid => $vocabulary) {
      $term_query = $term_storage->getQuery()
        ->accessCheck(TRUE)
        ->condition('vid', $vid)
        ->sort('weight', 'ASC')
        ->range(0, 500);

      $term_ids = $term_query->execute();
      if (empty($term_ids)) {
        continue;
      }

      $terms = $term_storage->loadMultiple($term_ids);
      $taxonomy[$vid] = [];

      foreach ($terms as $term) {
        $taxonomy[$vid][] = [
          'tid' => $term->id(),
          'name' => $term->getName(),
          'description' => $term->get('description')->value ?? '',
          'parent' => $term->get('parent_id') ? (int) $term->get('parent_id') : 0,
          'weight' => (int) $term->get('weight')->value,
        ];
      }
    }

    return $taxonomy;
  }

  /**
   * Export internal link relationships between nodes.
   *
   * Scans node body fields for internal links (href containing '/node/' or aliases)
   * and builds a source→target mapping.
   */
  private function exportInternalLinks(array $allowed_types): array {
    $links = [];
    $link_map = [];

    // Build a UUID→path lookup for all published nodes.
    $storage = $this->entityTypeManager->getStorage('node');
    $query = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('status', 1)
      ->range(0, 1000);

    $entity_ids = $query->execute();
    if (empty($entity_ids)) {
      return $links;
    }

    $entities = $storage->loadMultiple($entity_ids);

    foreach ($entities as $entity) {
      $uuid = $entity->uuid();
      $path = $entity->toUrl()->toString();
      $link_map['/' . ltrim($path, '/')] = $uuid;
      $link_map['/node/' . $entity->id()] = $uuid;
    }

    // Scan body fields for internal links.
    foreach ($entities as $entity) {
      if (!$entity->hasField('body') || $entity->get('body')->isEmpty()) {
        continue;
      }

      $body_value = $entity->get('body')->value ?? '';
      if (empty($body_value)) {
        continue;
      }

      $source_uuid = $entity->uuid();
      $target_uuids = [];

      // Extract internal links from HTML body.
      if (preg_match_all('/href=["\']\/([^"\']+)["\']/i', $body_value, $matches)) {
        foreach ($matches[1] as $path) {
          $normalized = '/' . ltrim($path, '/');
          if (isset($link_map[$normalized]) && $link_map[$normalized] !== $source_uuid) {
            $target_uuids[] = $link_map[$normalized];
          }
        }
      }

      if (!empty($target_uuids)) {
        $links[] = [
          'source_uuid' => $source_uuid,
          'target_uuids' => array_unique($target_uuids),
        ];
      }
    }

    return $links;
  }

}
