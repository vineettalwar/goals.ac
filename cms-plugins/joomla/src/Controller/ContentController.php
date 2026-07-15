<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 */

namespace GoalsAC\Joomla\Controller;

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Controller\BaseController;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\CMS\Table\Table;
use Joomla\CMS\Filter\InputFilter;
use GoalsAC\Shared\HMACAuth;
use GoalsAC\Shared\Idempotency;
use GoalsAC\Joomla\Helper\JoomlaNonceStore;
use GoalsAC\Joomla\Helper\JoomlaKeyStore;

/**
 * POST /goals-ac/content
 *
 * Receives content from the goals.ac SaaS platform and creates/updates
 * Joomla articles. Uses idempotency to prevent duplicate processing.
 */
class ContentController extends BaseController
{
    /**
     * Create or update an article.
     *
     * @return void
     */
    public function displayDefault(): void
    {
        $app    = Factory::getApplication();
        $params = PluginHelper::getPlugin('webservices', 'goalsac')->params ?? new \Joomla\Registry\Registry();

        if ((int) $params->get('hmac_enabled', 1) !== 1 || trim((string) $params->get('site_key', '')) === '') {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'auth_required',
                'message' => 'HMAC authentication is required.',
            ], 401);
            return;
        }

        $siteKey = (string) $params->get('site_key', '');
        $result  = $this->verifyHmac($app, $siteKey);

        if ($result !== true) {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => $result->code,
                'message' => $result->message,
            ], $result->status);
            return;
        }

        // Parse request body.
        $body = json_decode($app->input->server->getString('rawInput', '{}'), true);

        if (!is_array($body)) {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'invalid_body',
                'message' => 'Request body must be valid JSON.',
            ], 400);
            return;
        }

        // Check idempotency.
        $idempotencyKey = $app->input->server->getString('HTTP_X_IDEMPOTENCY_KEY', '');
        $keyStore       = new JoomlaKeyStore();

        $existing = Idempotency::check($idempotencyKey, $keyStore);
        if ($existing !== null) {
            $app->sendResponse((object) $existing);
            return;
        }

        // Validate required fields.
        $title = trim($body['title'] ?? '');
        if ($title === '') {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'missing_title',
                'message' => 'A title is required.',
            ], 400);
            return;
        }

        // Create or update the article.
        try {
            $articleId = $this->saveArticle($body);

            $response = [
                'success'  => true,
                'article'  => [
                    'id'    => $articleId,
                    'title' => $title,
                ],
            ];

            // Store idempotency result.
            Idempotency::store($idempotencyKey, $response, $keyStore);

            $app->sendResponse((object) $response);
        } catch (\Throwable $e) {
            $requestId = $this->requestId($app);
            $app->getLogger()->error(sprintf(
                'goals.ac content save failed [request_id=%s, exception=%s]: %s',
                $requestId,
                get_class($e),
                $e->getMessage()
            ));
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'save_failed',
                'message' => 'Unable to save article.',
                'requestId' => $requestId,
            ], 500);
        }
    }

    private function requestId($app): string
    {
        $supplied = $app->input->server->getString('HTTP_X_REQUEST_ID', '');
        return preg_match('/^[a-zA-Z0-9._-]{1,128}$/', $supplied)
            ? $supplied
            : bin2hex(random_bytes(16));
    }

    /**
     * Save an article to the Joomla content table.
     *
     * If `update_id` is present in the payload, update that article.
     * Otherwise, create a new one.
     *
     * @param  array  $data  The content payload.
     * @return int    The article ID.
     */
    private function saveArticle(array $data): int
    {
        $app = Factory::getApplication();
        $filter = InputFilter::getInstance();

        /** @var \Joomla\CMS\Table\Content $table */
        $table = Table::getInstance('content');

        $articleId = (int) ($data['update_id'] ?? 0);

        // Determine state mapping.
        $stateMap = [
            'draft'  => 0,
            'publish' => 1,
            'archive' => 2,
            'trash'  => -2,
        ];
        $statusInput = strtolower($filter->clean($data['status'] ?? 'publish', 'CMD'));
        $state       = $stateMap[$statusInput] ?? 1;

        $meta = is_array($data['meta'] ?? null) ? $data['meta'] : [];

        // Build article data.
        $articleData = [
            'title'     => $filter->clean($data['title'] ?? '', 'STRING'),
            'alias'     => $filter->clean($data['slug'] ?? '', 'STRING'),
            'introtext' => $filter->clean($data['content'] ?? '', 'HTML'),
            'state'     => $state,
            'catid'     => (int) ($data['categories'][0] ?? 0),
            'metadesc'  => $filter->clean($meta['description'] ?? '', 'STRING'),
            'metakey'   => $filter->clean($meta['keywords'] ?? '', 'STRING'),
            'access'    => 1,
            'language'  => '*',
        ];

        // HTTPS featured URL → `#__content.images` (intro + fulltext). Non-https skipped.
        $featuredUrl = trim((string) ($data['featuredImageUrl'] ?? $data['featured_image_url'] ?? ''));
        if ($featuredUrl !== '' && strpos($featuredUrl, 'https://') === 0) {
            $safeUrl = $filter->clean($featuredUrl, 'URL');
            if (is_string($safeUrl) && strpos($safeUrl, 'https://') === 0) {
                $articleData['images'] = json_encode([
                    'image_intro'            => $safeUrl,
                    'float_intro'            => '',
                    'image_intro_alt'        => '',
                    'image_intro_caption'    => '',
                    'image_fulltext'         => $safeUrl,
                    'float_fulltext'         => '',
                    'image_fulltext_alt'     => '',
                    'image_fulltext_caption' => '',
                ]);
            }
        }

        if ($articleId > 0) {
            // Load existing article.
            if (!$table->load($articleId)) {
                throw new \RuntimeException('Article not found: ' . $articleId);
            }

            $table->bind($articleData);

            if (!$table->store()) {
                throw new \RuntimeException('Failed to update article: ' . $table->getError());
            }
        } else {
            // Create new article.
            $table->bind($articleData);
            $table->created_by = $app->get('user')->id ?? 0;

            if (!$table->store()) {
                throw new \RuntimeException('Failed to create article: ' . $table->getError());
            }

            $articleId = (int) $table->id;
        }

        // Handle tags if provided.
        if (!empty($data['tags']) && is_array($data['tags'])) {
            $this->assignTags($articleId, $data['tags']);
        }

        // Handle featured image if provided.
        if (!empty($data['featured_image_id'])) {
            $this->setFeaturedImage($articleId, (int) $data['featured_image_id']);
        }

        return $articleId;
    }

    /**
     * Assign tags to an article.
     *
     * Joomla stores tags via the core_tags table. This replaces the
     * existing tag set.
     *
     * @param  int    $articleId
     * @param  array  $tagNames  Array of tag name strings.
     * @return void
     */
    private function assignTags(int $articleId, array $tagNames): void
    {
        $db = Factory::getDbo();
        $filter = InputFilter::getInstance();

        // Remove existing tag mappings.
        $query = $db->getQuery(true)
            ->delete($db->quoteName('#__contentitem_tag_map'))
            ->where($db->quoteName('core_content_id') . ' = ' . (int) $articleId)
            ->where($db->quoteName('core_type_alias') . ' = ' . $db->quote('com_content.article'));

        $db->setQuery($query)->execute();

        foreach ($tagNames as $tagName) {
            $tagName = $filter->clean(trim((string) $tagName), 'STRING');
            if ($tagName === '') {
                continue;
            }

            // Find or create the tag.
            $tagId = $this->findOrCreateTag($tagName);
            if ($tagId > 0) {
                $this->mapTag($articleId, $tagId);
            }
        }
    }

    /**
     * Find a tag by title or create it.
     *
     * @param  string  $title
     * @return int     Tag ID.
     */
    private function findOrCreateTag(string $title): int
    {
        $db = Factory::getDbo();

        $query = $db->getQuery(true)
            ->select($db->quoteName('id'))
            ->from($db->quoteName('#__tags'))
            ->where($db->quoteName('title') . ' = ' . $db->quote($title))
            ->where($db->quoteName('published') . ' = 1')
            ->setLimit(1);

        $tagId = (int) $db->setQuery($query)->loadResult();

        if ($tagId > 0) {
            return $tagId;
        }

        // Create the tag.
        $tag = Table::getInstance('tag', 'Joomla\\Table\\');
        $tag->bind([
            'title'     => $title,
            'alias'     => $title,
            'published' => 1,
            'access'    => 1,
            'language'  => '*',
        ]);

        if ($tag->store()) {
            return (int) $tag->id;
        }

        return 0;
    }

    /**
     * Map a tag to an article via the contentitem_tag_map table.
     *
     * @param  int  $articleId
     * @param  int  $tagId
     * @return void
     */
    private function mapTag(int $articleId, int $tagId): void
    {
        $db = Factory::getDbo();

        // Get the core_content_id for this article.
        $query = $db->getQuery(true)
            ->select($db->quoteName('core_content_id'))
            ->from($db->quoteName('#__contentitem_tag_map'))
            ->where($db->quoteName('content_item_id') . ' = ' . (int) $articleId)
            ->where($db->quoteName('core_type_alias') . ' = ' . $db->quote('com_content.article'))
            ->setLimit(1);

        $coreContentId = (int) $db->setQuery($query)->loadResult();

        if ($coreContentId === 0) {
            // If no mapping exists yet, the article may not have been tagged before.
            // Use the article ID as a fallback for the core_content_id reference.
            $coreContentId = $articleId;
        }

        $row = [
            $db->quoteName('core_content_id')   => (int) $coreContentId,
            $db->quoteName('content_item_id')    => (int) $articleId,
            $db->quoteName('tag_id')             => (int) $tagId,
            $db->quoteName('core_type_alias')    => $db->quote('com_content.article'),
        ];

        $query = $db->getQuery(true)
            ->insert($db->quoteName('#__contentitem_tag_map'))
            ->columns(array_keys($row))
            ->values(array_values($row));

        $db->setQuery($query)->execute();
    }

    /**
     * Set the featured image for an article.
     *
     * @param  int  $articleId
     * @param  int  $imageId   The Joomla media ID of the image.
     * @return void
     */
    private function setFeaturedImage(int $articleId, int $imageId): void
    {
        $db = Factory::getDbo();

        // Update the images column in the content table with the image path.
        $query = $db->getQuery(true)
            ->select($db->quoteName('filename'))
            ->from($db->quoteName('#__media'))
            ->where($db->quoteName('id') . ' = ' . (int) $imageId)
            ->setLimit(1);

        $filename = $db->setQuery($query)->loadResult();

        if (!empty($filename)) {
            $images = json_encode(['image_fulltext' => $filename]);
            $db->setQuery(
                $db->getQuery(true)
                    ->update($db->quoteName('#__content'))
                    ->set($db->quoteName('images') . ' = ' . $db->quote($images))
                    ->where($db->quoteName('id') . ' = ' . (int) $articleId)
            )->execute();
        }
    }

    /**
     * Verify HMAC authentication headers.
     *
     * @param  \Joomla\CMS\Application\CMSApplication  $app
     * @param  string  $siteKey
     * @return true|\stdClass
     */
    private function verifyHmac($app, string $siteKey)
    {
        $request = [
            'method'    => $app->input->server->getString('REQUEST_METHOD', 'POST'),
            'path'      => $this->getRequestPath(),
            'timestamp' => $app->input->server->getString('HTTP_X_GOALS_TIMESTAMP', ''),
            'nonce'     => $app->input->server->getString('HTTP_X_GOALS_NONCE', ''),
            'signature' => $app->input->server->getString('HTTP_X_GOALS_SIGNATURE', ''),
            'body'      => $app->input->server->getString('rawInput', ''),
        ];

        $nonceStore = new JoomlaNonceStore();

        return HMACAuth::verify($request, $siteKey, $nonceStore);
    }

    /**
     * Reconstruct the request path.
     */
    private function getRequestPath(): string
    {
        $app    = Factory::getApplication();
        $route  = $app->input->server->getString('REQUEST_URI', '/');
        $parsed = parse_url($route);
        return $parsed['path'] ?? $route;
    }
}
