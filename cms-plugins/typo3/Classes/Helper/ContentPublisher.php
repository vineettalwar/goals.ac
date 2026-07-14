<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class ContentPublisher
{
    private const MANAGED_CTYPES = ['header', 'text', 'textmedia'];

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

        $outputMode = strtolower((string)($payload['output_mode'] ?? 'body_text'));
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

        if ($pageUid > 0) {
            if (!$this->pageExists($pageUid) || !$this->pageManagedByGoalsAc($pageUid, $parentPageUid)) {
                throw new \InvalidArgumentException('update_id is not managed by goals.ac.');
            }
            $action = 'updated';
            $dataHandler->datamap['pages'][$pageUid] = [
                'title' => $title,
                'slug' => $slug,
                'hidden' => $hidden,
            ];
            $dataHandler->process_datamap();
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
        }

        if ($outputMode === 'content_elements') {
            $elements = $payload['content_elements'] ?? null;
            if (!is_array($elements) || count($elements) === 0) {
                throw new \InvalidArgumentException('content_elements is required when output_mode=content_elements.');
            }
            $replaceStrategy = strtolower((string)($payload['replace_strategy'] ?? 'managed_only'));
            $this->upsertContentElements($pageUid, $elements, $hidden, $replaceStrategy);
        } else {
            $content = $this->sanitizeContent((string)($payload['content'] ?? ''));
            $this->upsertBodyContent($pageUid, $title, $content, $hidden, $dataHandler);
        }

        return [
            'remote_id' => $pageUid,
            'url' => '/?id=' . $pageUid,
            'action' => $action,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $elements
     */
    private function upsertContentElements(
        int $pageUid,
        array $elements,
        int $hidden,
        string $replaceStrategy,
    ): void {
        $this->removeManagedContentElements($pageUid, $replaceStrategy);

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], []);

        $defaultSorting = 256;
        foreach ($elements as $index => $element) {
            if (!is_array($element)) {
                continue;
            }

            $ctype = strtolower(trim((string)($element['ctype'] ?? '')));
            if ($ctype === '' || !in_array($ctype, self::MANAGED_CTYPES, true)) {
                continue;
            }

            $fields = is_array($element['fields'] ?? null) ? $element['fields'] : [];
            $colPos = (int)($element['colPos'] ?? $element['col_pos'] ?? 0);
            $sorting = (int)($element['sorting'] ?? ($index + 1) * $defaultSorting);
            $record = $this->mapContentElementRecord($ctype, $fields, $pageUid, $hidden, $colPos, $sorting);

            $newContentId = 'NEW' . uniqid('', true);
            $dataHandler->datamap['tt_content'][$newContentId] = $record;
        }

        $dataHandler->process_datamap();
    }

    /**
     * @param array<string, mixed> $fields
     * @return array<string, mixed>
     */
    private function mapContentElementRecord(
        string $ctype,
        array $fields,
        int $pageUid,
        int $hidden,
        int $colPos,
        int $sorting,
    ): array {
        $record = [
            'pid' => $pageUid,
            'CType' => $ctype,
            'colPos' => $colPos,
            'sorting' => $sorting,
            'hidden' => $hidden,
        ];

        if ($ctype === 'header') {
            $record['header'] = trim((string)($fields['header'] ?? ''));
            $record['header_layout'] = max(0, (int)($fields['header_layout'] ?? 2));
            return $record;
        }

        if ($ctype === 'text') {
            $record['bodytext'] = $this->sanitizeContent((string)($fields['bodytext'] ?? ''));
            return $record;
        }

        $imageUrl = trim((string)($fields['image'] ?? $fields['image_url'] ?? ''));
        $imageAlt = trim((string)($fields['imagealt'] ?? $fields['image_alt'] ?? $fields['alt'] ?? ''));
        $bodytext = trim((string)($fields['bodytext'] ?? ''));

        if ($imageUrl !== '') {
            $safeUrl = htmlspecialchars($imageUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $safeAlt = htmlspecialchars($imageAlt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $figure = '<figure class="image"><img src="' . $safeUrl . '" alt="' . $safeAlt . '" loading="lazy" /></figure>';
            $bodytext = $bodytext !== '' ? $bodytext . "\n" . $figure : $figure;
        }

        $record['bodytext'] = $this->sanitizeContent($bodytext);
        return $record;
    }

    private function removeManagedContentElements(int $pageUid, string $replaceStrategy): void
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('tt_content');
        $query = [
            'pid' => $pageUid,
            'deleted' => 0,
        ];

        if ($replaceStrategy !== 'full_replace') {
            $query['CType'] = self::MANAGED_CTYPES;
        }

        $rows = $connection->select(['uid'], 'tt_content', $query)->fetchAllAssociative();
        if ($rows === []) {
            return;
        }

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], []);
        foreach ($rows as $row) {
            $uid = (int)($row['uid'] ?? 0);
            if ($uid > 0) {
                $dataHandler->cmdmap['delete']['tt_content'][$uid] = 1;
            }
        }
        $dataHandler->process_cmdmap();
    }

    private function sanitizeContent(string $content): string
    {
        $content = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $content) ?? '';
        $content = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $content) ?? '';
        $content = preg_replace('/\s+on\w+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $content) ?? '';
        $content = preg_replace('/javascript:/i', '', $content) ?? '';

        return $content;
    }

    private function pageManagedByGoalsAc(int $pageUid, int $parentPageUid): bool
    {
        if ($parentPageUid <= 0) {
            return false;
        }

        $current = $pageUid;
        while ($current > 0) {
            if ($current === $parentPageUid) {
                return true;
            }

            $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('pages');
            $row = $connection->select(['pid'], 'pages', ['uid' => $current, 'deleted' => 0])->fetchAssociative();
            if ($row === false) {
                return false;
            }

            $current = (int)($row['pid'] ?? 0);
        }

        return false;
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
