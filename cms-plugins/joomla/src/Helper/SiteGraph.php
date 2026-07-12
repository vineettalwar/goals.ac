<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 */

namespace GoalsAC\Joomla\Helper;

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Component\ComponentHelper;
use Joomla\Database\DatabaseDriver;

/**
 * Exports the full site graph from Joomla: articles, categories, tags,
 * and internal link relationships.
 */
class SiteGraph
{
    /**
     * @var DatabaseDriver
     */
    private DatabaseDriver $db;

    public function __construct()
    {
        $this->db = Factory::getDbo();
    }

    /**
     * Export the complete site graph.
     *
     * @return array{
     *     articles:   array<int, array<string, mixed>>,
     *     categories: array<int, array<string, mixed>>,
     *     tags:       array<int, array<string, mixed>>,
     *     links:      array<int, array{source: int, target: int, anchor: string}>,
     * }
     */
    public function export(): array
    {
        $articles   = $this->getArticles();
        $categories = $this->getCategories();
        $tags       = $this->getTags();
        $links      = $this->getInternalLinks($articles);

        return [
            'articles'   => $articles,
            'categories' => $categories,
            'tags'       => $tags,
            'links'      => $links,
        ];
    }

    /**
     * Export published articles from com_content.
     *
     * @return array<int, array{ id: int, title: string, slug: string, content: string, status: string, category_id: int, tags: string[], url: string, created_at: string, updated_at: string }>
     */
    private function getArticles(): array
    {
        $query = $this->db->getQuery(true)
            ->select([
                $this->db->quoteName('c.id'),
                $this->db->quoteName('c.title'),
                $this->db->quoteName('c.alias'),
                $this->db->quoteName('c.introtext', 'content'),
                $this->db->quoteName('c.state', 'state_raw'),
                $this->db->quoteName('c.catid', 'category_id'),
                $this->db->quoteName('c.created', 'created_at'),
                $this->db->quoteName('c.modified', 'updated_at'),
            ])
            ->from($this->db->quoteName('#__content', 'c'))
            ->where($this->db->quoteName('c.state') . ' IN (1, -2)');

        $rows = $this->db->setQuery($query)->loadObjectList();

        $stateMap = [1 => 'publish', 0 => 'draft', -2 => 'trash', 2 => 'archive'];

        $articles = [];
        foreach ($rows as $row) {
            $id    = (int) $row->id;
            $alias = (string) $row->alias;

            $articles[$id] = [
                'id'          => $id,
                'title'       => (string) $row->title,
                'slug'        => $alias !== '' ? $alias : 'article-' . $id,
                'content'     => (string) $row->content,
                'status'      => $stateMap[(int) $row->state_raw] ?? 'publish',
                'category_id' => (int) $row->category_id,
                'tags'        => $this->getArticleTags($id),
                'url'         => '/index.php?option=com_content&view=article&id=' . $id . '-' . $alias,
                'created_at'  => (string) $row->created_at,
                'updated_at'  => (string) $row->updated_at,
            ];
        }

        return $articles;
    }

    /**
     * Get tag names for a given article.
     *
     * @param  int  $articleId
     * @return string[]
     */
    private function getArticleTags(int $articleId): array
    {
        $query = $this->db->getQuery(true)
            ->select($this->db->quoteName('t.title'))
            ->from($this->db->quoteName('#__contentitem_tag_map', 'm'))
            ->innerJoin(
                $this->db->quoteName('#__tags', 't') .
                ' ON ' . $this->db->quoteName('t.id') . ' = ' . $this->db->quoteName('m.tag_id')
            )
            ->where($this->db->quoteName('m.content_item_id') . ' = ' . (int) $articleId)
            ->where($this->db->quoteName('m.core_type_alias') . ' = ' . $this->db->quote('com_content.article'))
            ->where($this->db->quoteName('t.published') . ' = 1');

        return $this->db->setQuery($query)->loadColumn() ?: [];
    }

    /**
     * Export active categories from com_categories.
     *
     * @return array<int, array{ id: int, title: string, slug: string, parent_id: int, description: string, url: string }>
     */
    private function getCategories(): array
    {
        $query = $this->db->getQuery(true)
            ->select([
                $this->db->quoteName('c.id'),
                $this->db->quoteName('c.title'),
                $this->db->quoteName('c.alias'),
                $this->db->quoteName('c.parent_id'),
                $this->db->quoteName('c.description'),
            ])
            ->from($this->db->quoteName('#__categories', 'c'))
            ->where($this->db->quoteName('c.extension') . ' = ' . $this->db->quote('com_content'))
            ->where($this->db->quoteName('c.published') . ' = 1');

        $rows = $this->db->setQuery($query)->loadObjectList();

        $categories = [];
        foreach ($rows as $row) {
            $id    = (int) $row->id;
            $alias = (string) $row->alias;

            $categories[$id] = [
                'id'          => $id,
                'title'       => (string) $row->title,
                'slug'        => $alias !== '' ? $alias : 'category-' . $id,
                'parent_id'   => (int) $row->parent_id,
                'description' => (string) $row->description,
                'url'         => '/index.php?option=com_content&view=category&id=' . $id . '-' . $alias,
            ];
        }

        return $categories;
    }

    /**
     * Export active tags.
     *
     * @return array<int, array{ id: int, title: string, slug: string, url: string }>
     */
    private function getTags(): array
    {
        $query = $this->db->getQuery(true)
            ->select([
                $this->db->quoteName('t.id'),
                $this->db->quoteName('t.title'),
                $this->db->quoteName('t.alias'),
            ])
            ->from($this->db->quoteName('#__tags', 't'))
            ->where($this->db->quoteName('t.published') . ' = 1');

        $rows = $this->db->setQuery($query)->loadObjectList();

        $tags = [];
        foreach ($rows as $row) {
            $id    = (int) $row->id;
            $alias = (string) $row->alias;

            $tags[$id] = [
                'id'    => $id,
                'title' => (string) $row->title,
                'slug'  => $alias !== '' ? $alias : 'tag-' . $id,
                'url'   => '/index.php?option=com_tags&view=tag&id=' . $id . '-' . $alias,
            ];
        }

        return $tags;
    }

    /**
     * Extract internal links from article content.
     *
     * Parses href attributes for Joomla-internal URLs and resolves them
     * to article IDs where possible.
     *
     * @param  array  $articles  The exported articles array.
     * @return array<int, array{ source: int, target: int, anchor: string }>
     */
    private function getInternalLinks(array $articles): array
    {
        $links  = [];
        $linkId = 0;

        // Build a map of alias → article ID for resolution.
        $slugMap = [];
        foreach ($articles as $id => $article) {
            $slugMap[$article['slug']] = $id;
        }

        foreach ($articles as $article) {
            $content = $article['content'];
            $sourceId = $article['id'];

            // Match href="/index.php?option=com_content&view=article&id=123-alias"
            // and href="/123-alias" style links.
            if (preg_match_all('/href\s*=\s*["\']([^"\']+)["\']/i', $content, $matches)) {
                foreach ($matches[1] as $url) {
                    $targetId = $this->resolveUrl($url, $slugMap);

                    if ($targetId !== null && $targetId !== $sourceId) {
                        $links[] = [
                            'id'     => $linkId++,
                            'source' => $sourceId,
                            'target' => $targetId,
                            'anchor' => $url,
                        ];
                    }
                }
            }
        }

        return $links;
    }

    /**
     * Resolve a URL to an article ID.
     *
     * @param  string       $url
     * @param  array        $slugMap  slug → article ID mapping.
     * @return int|null
     */
    private function resolveUrl(string $url, array $slugMap): ?int
    {
        // Pattern: /index.php?option=com_content&view=article&id=123-alias
        if (preg_match('/id=(\d+)/', $url, $m)) {
            return (int) $m[1];
        }

        // Pattern: /123-some-alias (Joomla SEF URL)
        if (preg_match('#^/(\d+)-#', $url, $m)) {
            return (int) $m[1];
        }

        // Try slug lookup for /category/slug style URLs.
        $path = parse_url($url, PHP_URL_PATH) ?? $url;
        $segments = array_filter(explode('/', trim($path, '/')));

        foreach (array_reverse($segments) as $segment) {
            if (isset($slugMap[$segment])) {
                return $slugMap[$segment];
            }
        }

        return null;
    }
}
