<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class SiteGraph
{
    private const LIMIT = 500;

    /**
     * @return array<string, mixed>
     */
    public function export(): array
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('pages');
        $pages = array_slice(
            $connection->select(
                ['uid', 'title', 'slug', 'hidden', 'doktype', 'tstamp'],
                'pages',
                ['doktype' => 1, 'deleted' => 0]
            )->fetchAllAssociative(),
            0,
            self::LIMIT
        );

        $contentConnection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('tt_content');
        $content = array_slice(
            $contentConnection->select(
                ['uid', 'pid', 'header', 'CType', 'hidden', 'tstamp'],
                'tt_content',
                ['CType' => 'text', 'deleted' => 0]
            )->fetchAllAssociative(),
            0,
            self::LIMIT
        );

        return [
            'cms' => 'typo3',
            'exported_at' => gmdate('c'),
            'limit' => self::LIMIT,
            'pages' => array_map(static function (array $row): array {
                return [
                    'id' => (int)$row['uid'],
                    'title' => (string)$row['title'],
                    'slug' => (string)($row['slug'] ?? ''),
                    'status' => (int)$row['hidden'] === 1 ? 'draft' : 'published',
                    'url' => '/?id=' . (int)$row['uid'],
                ];
            }, $pages),
            'content_elements' => array_map(static function (array $row): array {
                return [
                    'id' => (int)$row['uid'],
                    'page_id' => (int)$row['pid'],
                    'title' => (string)($row['header'] ?? ''),
                    'type' => (string)$row['CType'],
                    'status' => (int)$row['hidden'] === 1 ? 'draft' : 'published',
                ];
            }, $content),
        ];
    }
}
