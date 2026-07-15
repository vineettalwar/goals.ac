<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class ContentPublisher
{
    private const MANAGED_CTYPES = ['header', 'text', 'textmedia'];

    private const FAL_UPLOAD_FOLDER = 'user_upload/goals-ac';

    /** PNG/JPEG only — matches SaaS raster featured helpers (~5MB decoded). */
    private const MAX_BASE64_IMAGE_BYTES = 5242880;

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

        $dataHandler = $this->newDataHandler();

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

        $dataHandler = $this->newDataHandler();

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

            $newContentId = 'NEW' . uniqid('', true);
            if ($ctype === 'textmedia') {
                $this->addTextmediaToDatamap(
                    $dataHandler,
                    $newContentId,
                    $fields,
                    $pageUid,
                    $hidden,
                    $colPos,
                    $sorting,
                );
                continue;
            }

            $dataHandler->datamap['tt_content'][$newContentId] = $this->mapContentElementRecord(
                $ctype,
                $fields,
                $pageUid,
                $hidden,
                $colPos,
                $sorting,
            );
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

        $record['bodytext'] = $this->sanitizeContent((string)($fields['bodytext'] ?? ''));
        return $record;
    }

    /**
     * Prefer FAL sys_file_reference on textmedia.assets; fall back to bodytext img.
     *
     * @param array<string, mixed> $fields
     */
    private function addTextmediaToDatamap(
        DataHandler $dataHandler,
        string $newContentId,
        array $fields,
        int $pageUid,
        int $hidden,
        int $colPos,
        int $sorting,
    ): void {
        $imageUrl = trim((string)($fields['image'] ?? $fields['image_url'] ?? ''));
        $imageBase64 = trim((string)($fields['imageBase64'] ?? $fields['image_base64'] ?? ''));
        $imageMime = trim((string)($fields['imageMime'] ?? $fields['image_mime'] ?? ''));
        $imageFilename = trim((string)($fields['filename'] ?? $fields['imageFilename'] ?? ''));
        $imageAlt = trim((string)($fields['imagealt'] ?? $fields['image_alt'] ?? $fields['alt'] ?? ''));
        $bodytext = trim((string)($fields['bodytext'] ?? ''));

        $record = [
            'pid' => $pageUid,
            'CType' => 'textmedia',
            'colPos' => $colPos,
            'sorting' => $sorting,
            'hidden' => $hidden,
            'bodytext' => $this->sanitizeContent($bodytext),
        ];

        $fileUid = null;
        if ($imageBase64 !== '') {
            $fileUid = $this->importBase64ImageToFal($imageBase64, $imageMime, $imageFilename);
        }
        if ($fileUid === null && $imageUrl !== '') {
            $fileUid = $this->resolveOrImportFalFile($imageUrl);
        }

        if ($fileUid !== null) {
            $newRefId = 'NEW' . uniqid('', true);
            $record['assets'] = $newRefId;
            $dataHandler->datamap['sys_file_reference'][$newRefId] = [
                'uid_local' => $fileUid,
                'tablenames' => 'tt_content',
                'uid_foreign' => $newContentId,
                'fieldname' => 'assets',
                'pid' => $pageUid,
                'alternative' => $imageAlt,
                'title' => $imageAlt,
            ];
        } elseif ($imageUrl !== '' && !$this->isRasterImageDataUri($imageUrl)) {
            // HTTP URL only — never inline huge data URIs into bodytext.
            $record['bodytext'] = $this->sanitizeContent(
                $this->appendInlineImageFigure($bodytext, $imageUrl, $imageAlt),
            );
        }

        $dataHandler->datamap['tt_content'][$newContentId] = $record;
    }

    private function appendInlineImageFigure(string $bodytext, string $imageUrl, string $imageAlt): string
    {
        $safeUrl = htmlspecialchars($imageUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeAlt = htmlspecialchars($imageAlt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $figure = '<figure class="image"><img src="' . $safeUrl . '" alt="' . $safeAlt
            . '" loading="lazy" /></figure>';

        return $bodytext !== '' ? $bodytext . "\n" . $figure : $figure;
    }

    private function resolveOrImportFalFile(string $imageUrl): ?int
    {
        try {
            if ($this->isRasterImageDataUri($imageUrl)) {
                return $this->importBase64ImageToFal($imageUrl, '', '');
            }

            if (!class_exists(\TYPO3\CMS\Core\Resource\StorageRepository::class)) {
                return null;
            }

            $storageRepository = GeneralUtility::makeInstance(
                \TYPO3\CMS\Core\Resource\StorageRepository::class,
            );
            $storage = $storageRepository->getDefaultStorage();
            if ($storage === null) {
                return null;
            }

            $existingUid = $this->resolveExistingFalUid($storage, $imageUrl);
            if ($existingUid !== null) {
                return $existingUid;
            }

            return $this->importRemoteImageToFal($storage, $imageUrl);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Write PNG/JPEG from raw base64 or data URI into default FAL storage (no HTTP fetch).
     */
    private function importBase64ImageToFal(string $imageBase64, string $mimeHint, string $preferredFilename): ?int
    {
        try {
            $decoded = $this->decodeRasterImagePayload($imageBase64, $mimeHint);
            if ($decoded === null) {
                return null;
            }

            if (!class_exists(\TYPO3\CMS\Core\Resource\StorageRepository::class)) {
                return null;
            }

            $storageRepository = GeneralUtility::makeInstance(
                \TYPO3\CMS\Core\Resource\StorageRepository::class,
            );
            $storage = $storageRepository->getDefaultStorage();
            if ($storage === null) {
                return null;
            }

            $filename = $this->sanitizeImageFilename($preferredFilename, $decoded['mime']);
            return $this->addBinaryToFal($storage, $decoded['binary'], $filename);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array{binary: string, mime: string}|null
     */
    private function decodeRasterImagePayload(string $payload, string $mimeHint): ?array
    {
        $trimmed = trim($payload);
        if ($trimmed === '') {
            return null;
        }

        $mime = '';
        $b64 = $trimmed;

        if (str_starts_with(strtolower($trimmed), 'data:image/')) {
            if (!preg_match(
                '#^data:image/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$#i',
                $trimmed,
                $matches,
            )) {
                return null;
            }
            $subtype = strtolower($matches[1]);
            $mime = $subtype === 'png' ? 'image/png' : 'image/jpeg';
            $b64 = $matches[2];
        }

        $binary = base64_decode(preg_replace('/\s+/', '', $b64) ?? '', true);
        if (!is_string($binary) || $binary === '') {
            return null;
        }
        if (strlen($binary) > self::MAX_BASE64_IMAGE_BYTES) {
            return null;
        }

        if ($mime === '') {
            $hint = strtolower(trim($mimeHint));
            if ($hint === 'image/png' || $hint === 'png') {
                $mime = 'image/png';
            } elseif (in_array($hint, ['image/jpeg', 'image/jpg', 'jpeg', 'jpg'], true)) {
                $mime = 'image/jpeg';
            } else {
                $mime = $this->sniffRasterImageMime($binary) ?? '';
            }
        }

        if ($mime !== 'image/png' && $mime !== 'image/jpeg') {
            return null;
        }

        return ['binary' => $binary, 'mime' => $mime];
    }

    private function isRasterImageDataUri(string $value): bool
    {
        return (bool)preg_match(
            '#^data:image/(png|jpeg|jpg);base64,[A-Za-z0-9+/=\s]+$#i',
            trim($value),
        );
    }

    private function sniffRasterImageMime(string $binary): ?string
    {
        if (str_starts_with($binary, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }
        if (str_starts_with($binary, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        return null;
    }

    private function sanitizeImageFilename(string $preferred, string $mime): string
    {
        $ext = $mime === 'image/png' ? 'png' : 'jpg';
        $basename = preg_replace('/[^a-zA-Z0-9._-]/', '', $preferred) ?? '';
        if ($basename !== '' && str_contains($basename, '.')) {
            return $basename;
        }
        if ($basename !== '') {
            return $basename . '.' . $ext;
        }
        return 'image-' . substr(sha1($mime . microtime(true)), 0, 12) . '.' . $ext;
    }

    /**
     * @param object $storage TYPO3 ResourceStorage
     */
    private function addBinaryToFal(object $storage, string $binary, string $filename): ?int
    {
        $this->initBackendUserForDataHandler();

        if (!method_exists(GeneralUtility::class, 'tempnam')) {
            return null;
        }

        $tempPath = GeneralUtility::tempnam('goals_ac_img_');
        if (!is_string($tempPath) || $tempPath === '') {
            return null;
        }

        try {
            if (file_put_contents($tempPath, $binary) === false) {
                return null;
            }

            $folder = $this->resolveGoalsAcUploadFolder($storage);
            if ($folder === null || !method_exists($storage, 'addFile')) {
                return null;
            }

            $file = $storage->addFile($tempPath, $folder, $filename);
            if (!is_object($file) || !method_exists($file, 'getUid')) {
                return null;
            }

            $uid = (int)$file->getUid();
            return $uid > 0 ? $uid : null;
        } finally {
            if (is_file($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    /**
     * @param object $storage TYPO3 ResourceStorage
     */
    private function resolveExistingFalUid(object $storage, string $imageUrl): ?int
    {
        $identifier = $this->fileadminIdentifierFromUrl($imageUrl);
        if ($identifier === null) {
            return null;
        }

        if (!method_exists($storage, 'hasFile') || !method_exists($storage, 'getFile')) {
            return null;
        }

        if (!$storage->hasFile($identifier)) {
            return null;
        }

        $file = $storage->getFile($identifier);
        if (!is_object($file) || !method_exists($file, 'getUid')) {
            return null;
        }

        $uid = (int)$file->getUid();
        return $uid > 0 ? $uid : null;
    }

    private function fileadminIdentifierFromUrl(string $imageUrl): ?string
    {
        $path = parse_url($imageUrl, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            $path = $imageUrl;
        }

        $normalized = '/' . ltrim(str_replace('\\', '/', $path), '/');
        $marker = '/fileadmin/';
        $pos = strpos($normalized, $marker);
        if ($pos === false) {
            if (str_starts_with(ltrim($normalized, '/'), 'fileadmin/')) {
                $relative = substr(ltrim($normalized, '/'), strlen('fileadmin'));
                return '/' . ltrim($relative, '/');
            }
            return null;
        }

        $relative = substr($normalized, $pos + strlen($marker));
        return '/' . ltrim($relative, '/');
    }

    /**
     * @param object $storage TYPO3 ResourceStorage
     */
    private function importRemoteImageToFal(object $storage, string $imageUrl): ?int
    {
        if (!$this->isSafeRemoteImageUrl($imageUrl)) {
            return null;
        }

        $downloaded = $this->downloadImageToTempFile($imageUrl);
        if ($downloaded === null) {
            return null;
        }

        [$tempPath, $filename] = $downloaded;

        try {
            $this->initBackendUserForDataHandler();
            $folder = $this->resolveGoalsAcUploadFolder($storage);
            if ($folder === null || !method_exists($storage, 'addFile')) {
                return null;
            }

            $file = $storage->addFile($tempPath, $folder, $filename);
            if (!is_object($file) || !method_exists($file, 'getUid')) {
                return null;
            }

            $uid = (int)$file->getUid();
            return $uid > 0 ? $uid : null;
        } finally {
            if (is_file($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    /**
     * @param object $storage TYPO3 ResourceStorage
     * @return object|null Folder
     */
    private function resolveGoalsAcUploadFolder(object $storage): ?object
    {
        if (method_exists($storage, 'hasFolder') && method_exists($storage, 'getFolder')
            && $storage->hasFolder(self::FAL_UPLOAD_FOLDER)
        ) {
            return $storage->getFolder(self::FAL_UPLOAD_FOLDER);
        }

        try {
            $parent = $this->getOrCreateUserUploadFolder($storage);
            if ($parent === null) {
                return $this->fallbackUploadFolder($storage);
            }

            if (method_exists($parent, 'hasFolder') && $parent->hasFolder('goals-ac')) {
                if (method_exists($parent, 'getSubfolder')) {
                    return $parent->getSubfolder('goals-ac');
                }
                if (method_exists($storage, 'getFolder')) {
                    return $storage->getFolder(self::FAL_UPLOAD_FOLDER);
                }
            }

            if (method_exists($parent, 'createFolder')) {
                return $parent->createFolder('goals-ac');
            }
            if (method_exists($storage, 'createFolder')) {
                return $storage->createFolder('goals-ac', $parent);
            }
        } catch (\Throwable) {
            // Concurrent create or missing FAL APIs — fall back.
        }

        return $this->fallbackUploadFolder($storage);
    }

    /**
     * Create fileadmin/user_upload when missing (API/CLI has no prior FAL tree).
     *
     * @param object $storage TYPO3 ResourceStorage
     * @return object|null Folder
     */
    private function getOrCreateUserUploadFolder(object $storage): ?object
    {
        if (!method_exists($storage, 'getFolder')) {
            return null;
        }

        if (method_exists($storage, 'hasFolder') && $storage->hasFolder('user_upload')) {
            return $storage->getFolder('user_upload');
        }

        if (!method_exists($storage, 'createFolder')) {
            return null;
        }

        try {
            $storage->createFolder('user_upload');
        } catch (\Throwable) {
            // Race: another request may have created user_upload.
        }

        return $storage->getFolder('user_upload');
    }

    /**
     * @param object $storage TYPO3 ResourceStorage
     * @return object|null Folder
     */
    private function fallbackUploadFolder(object $storage): ?object
    {
        if (method_exists($storage, 'getDefaultFolder')) {
            return $storage->getDefaultFolder();
        }

        return method_exists($storage, 'getRootLevelFolder') ? $storage->getRootLevelFolder() : null;
    }

    /**
     * @return array{0: string, 1: string}|null [tempPath, filename]
     */
    private function downloadImageToTempFile(string $imageUrl): ?array
    {
        if (!method_exists(GeneralUtility::class, 'getUrl') || !method_exists(GeneralUtility::class, 'tempnam')) {
            return null;
        }

        $binary = GeneralUtility::getUrl($imageUrl);
        if (!is_string($binary) || $binary === '') {
            return null;
        }

        $path = parse_url($imageUrl, PHP_URL_PATH);
        $basename = is_string($path) ? basename($path) : '';
        $basename = preg_replace('/[^a-zA-Z0-9._-]/', '', $basename) ?? '';
        if ($basename === '' || !str_contains($basename, '.')) {
            $basename = 'image-' . substr(sha1($imageUrl), 0, 12) . '.jpg';
        }

        $tempPath = GeneralUtility::tempnam('goals_ac_img_');
        if (!is_string($tempPath) || $tempPath === '') {
            return null;
        }

        if (file_put_contents($tempPath, $binary) === false) {
            @unlink($tempPath);
            return null;
        }

        return [$tempPath, $basename];
    }

    private function isSafeRemoteImageUrl(string $url): bool
    {
        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $parts = parse_url($url);
        if (!is_array($parts)) {
            return false;
        }

        $scheme = strtolower((string)($parts['scheme'] ?? ''));
        if (!in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $host = strtolower((string)($parts['host'] ?? ''));
        if ($host === '' || $host === 'localhost' || str_ends_with($host, '.localhost')
            || $host === 'metadata.google.internal'
        ) {
            return false;
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return (bool)filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            );
        }

        $resolved = gethostbyname($host);
        if ($resolved !== $host && filter_var($resolved, FILTER_VALIDATE_IP)) {
            return (bool)filter_var(
                $resolved,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            );
        }

        return true;
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

        $dataHandler = $this->newDataHandler();
        foreach ($rows as $row) {
            $uid = (int)($row['uid'] ?? 0);
            if ($uid > 0) {
                $dataHandler->cmdmap['delete']['tt_content'][$uid] = 1;
            }
        }
        $dataHandler->process_cmdmap();
    }

    /**
     * DataHandler requires a BackendUserAuthentication (cruser_id, isAdmin, FAL ACLs).
     * Middleware / API requests usually have none — init a synthetic admin BE user.
     */
    private function newDataHandler(): DataHandler
    {
        $this->initBackendUserForDataHandler();
        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], []);
        return $dataHandler;
    }

    private function initBackendUserForDataHandler(): void
    {
        $existing = $GLOBALS['BE_USER'] ?? null;
        if (is_object($existing)
            && is_array($existing->user ?? null)
            && (int)($existing->user['uid'] ?? 0) > 0
        ) {
            $this->initLanguageServiceIfMissing($existing);
            return;
        }

        if (!class_exists(\TYPO3\CMS\Core\Authentication\BackendUserAuthentication::class)) {
            return;
        }

        $beUser = GeneralUtility::makeInstance(
            \TYPO3\CMS\Core\Authentication\BackendUserAuthentication::class,
        );
        $beUser->user = [
            'uid' => 1,
            'username' => '_goals_ac',
            'admin' => 1,
            'workspace_id' => 0,
            'lang' => 'default',
        ];
        if (property_exists($beUser, 'workspace')) {
            $beUser->workspace = 0;
        }
        $GLOBALS['BE_USER'] = $beUser;
        $this->initLanguageServiceIfMissing($beUser);
    }

    private function initLanguageServiceIfMissing(object $beUser): void
    {
        if (isset($GLOBALS['LANG']) && is_object($GLOBALS['LANG'])) {
            return;
        }

        if (!class_exists(\TYPO3\CMS\Core\Localization\LanguageServiceFactory::class)) {
            return;
        }

        try {
            $factory = GeneralUtility::makeInstance(
                \TYPO3\CMS\Core\Localization\LanguageServiceFactory::class,
            );
            if (method_exists($factory, 'createFromUserPreferences')) {
                $GLOBALS['LANG'] = $factory->createFromUserPreferences($beUser);
            } elseif (method_exists($factory, 'create')) {
                $GLOBALS['LANG'] = $factory->create('default');
            }
        } catch (\Throwable) {
            // DataHandler can proceed; some error paths need LANG only.
        }
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

        $this->initBackendUserForDataHandler();
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
