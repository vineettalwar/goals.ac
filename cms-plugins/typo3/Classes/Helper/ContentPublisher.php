<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class ContentPublisher
{
    /**
     * @param array<string, mixed> $payload
     * @return array{remote_id: int, url: string, action: string}
     */
    public function publish(array $payload, int $parentPageUid): array
    {
        $title = trim((string)($payload['title'] ?? ''));
        if ($title === '') {
            throw new \InvalidArgumentException('title is required.');
        }

        $content = (string)($payload['content'] ?? '');
        $status = strtolower((string)($payload['status'] ?? 'draft'));
        $hidden = in_array($status, ['publish', 'published'], true) ? 0 : 1;
        $slug = trim((string)($payload['slug'] ?? ''));
        if ($slug === '') {
            $slug = $this->slugify($title);
        }

        $updateId = (int)($payload['update_id'] ?? 0);
        $pageUid = $updateId > 0 ? $updateId : 0;
        $action = 'created';

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], []);

        if ($pageUid > 0 && $this->pageExists($pageUid)) {
            $action = 'updated';
            $dataHandler->datamap['pages'][$pageUid] = [
                'title' => $title,
                'slug' => $slug,
                'hidden' => $hidden,
            ];
            $dataHandler->process_datamap();
            $this->upsertBodyContent($pageUid, $title, $content, $hidden, $dataHandler);
        } else {
            $newPageId = 'NEW' . uniqid('', true);
            $dataHandler->datamap['pages'][$newPageId] = [
                'pid' => $parentPageUid,
                'doktype' => 1,
                'title' => $title,
                'slug' => $slug,
                'hidden' => $hidden,
            ];
            $dataHandler->process_datamap();
            $pageUid = (int)($dataHandler->substNEWwithIDs[$newPageId] ?? 0);
            if ($pageUid <= 0) {
                throw new \RuntimeException('Failed to create TYPO3 page record.');
            }
            $this->upsertBodyContent($pageUid, $title, $content, $hidden, $dataHandler);
        }

        return [
            'remote_id' => $pageUid,
            'url' => '/?id=' . $pageUid,
            'action' => $action,
        ];
    }

    private function pageExists(int $pageUid): bool
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('pages');
        $row = $connection->select(['uid'], 'pages', ['uid' => $pageUid, 'deleted' => 0])->fetchAssociative();
        return $row !== false;
    }

    private function upsertBodyContent(
        int $pageUid,
        string $title,
        string $content,
        int $hidden,
        DataHandler $dataHandler,
    ): void {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('tt_content');
        $existing = $connection->select(['uid'], 'tt_content', [
            'pid' => $pageUid,
            'CType' => 'text',
            'deleted' => 0,
        ])->fetchAssociative();

        $dataHandler->start([], []);
        if ($existing !== false) {
            $contentUid = (int)$existing['uid'];
            $dataHandler->datamap['tt_content'][$contentUid] = [
                'header' => $title,
                'bodytext' => $content,
                'hidden' => $hidden,
            ];
        } else {
            $newContentId = 'NEW' . uniqid('', true);
            $dataHandler->datamap['tt_content'][$newContentId] = [
                'pid' => $pageUid,
                'CType' => 'text',
                'header' => $title,
                'bodytext' => $content,
                'hidden' => $hidden,
            ];
        }
        $dataHandler->process_datamap();
    }

    private function slugify(string $title): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $title) ?? '', '-'));
        return $slug !== '' ? $slug : 'post';
    }
}
