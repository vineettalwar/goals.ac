<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Shared raster-image FAL import used by ContentPublisher (inline textmedia
 * assets) and MediaController (standalone `/media` upload). No HTTP fetch
 * for base64 payloads — writes directly into the default FAL storage.
 */
final class FalImporter
{
    private const FAL_UPLOAD_FOLDER = 'user_upload/goals-ac';

    /** ~5MB decoded — matches SaaS raster featured/media helpers. */
    private const MAX_BASE64_IMAGE_BYTES = 5242880;

    private const DEFAULT_ALLOWED_MIMES = ['image/png', 'image/jpeg'];

    /**
     * Decode a raw base64 or data-URI payload and write it into the default
     * FAL storage. Returns the new file's uid, or null on any failure.
     *
     * @param array<int, string> $allowedMimes
     */
    public function importBase64Image(
        string $imageBase64,
        string $mimeHint,
        string $preferredFilename,
        array $allowedMimes = self::DEFAULT_ALLOWED_MIMES,
    ): ?int {
        try {
            $decoded = $this->decodeRasterImagePayload($imageBase64, $mimeHint, $allowedMimes);
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
     * Resolve an existing fileadmin FAL file from a URL, a raster data URI
     * (imported inline), or a remote HTTP(S) URL (downloaded then imported).
     */
    public function resolveOrImportRemote(string $imageUrl): ?int
    {
        try {
            if ($this->isRasterImageDataUri($imageUrl)) {
                return $this->importBase64Image($imageUrl, '', '');
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

    public function isRasterImageDataUri(string $value): bool
    {
        return (bool)preg_match(
            '#^data:image/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$#i',
            trim($value),
        );
    }

    /**
     * Public (site-relative) URL for a previously imported FAL file. Never
     * fabricates a host — returns whatever TYPO3's own File::getPublicUrl()
     * resolves to, or null if unavailable.
     */
    public function publicUrlForUid(int $fileUid): ?string
    {
        try {
            if (!class_exists(\TYPO3\CMS\Core\Resource\ResourceFactory::class)) {
                return null;
            }

            $factory = GeneralUtility::makeInstance(\TYPO3\CMS\Core\Resource\ResourceFactory::class);
            if (!method_exists($factory, 'getFileObject')) {
                return null;
            }

            $file = $factory->getFileObject($fileUid);
            if (!is_object($file) || !method_exists($file, 'getPublicUrl')) {
                return null;
            }

            $publicUrl = $file->getPublicUrl();
            if (!is_string($publicUrl) || $publicUrl === '') {
                return null;
            }

            return '/' . ltrim($publicUrl, '/');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Best-effort sys_file_metadata update (alt/title/caption). Swallows
     * failures — the file import itself has already succeeded by this point.
     *
     * @param array<string, string> $meta Column => value, e.g. 'alternative', 'title', 'description'.
     */
    public function updateMetadata(int $fileUid, array $meta): void
    {
        if ($meta === []) {
            return;
        }

        try {
            $connection = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getConnectionForTable('sys_file_metadata');
            $existing = $connection->select(['uid'], 'sys_file_metadata', ['file' => $fileUid])
                ->fetchAssociative();
            if ($existing === false || !method_exists($connection, 'update')) {
                return;
            }

            $connection->update('sys_file_metadata', $meta, ['uid' => (int)$existing['uid']]);
        } catch (\Throwable) {
            // Metadata is cosmetic; the import already succeeded.
        }
    }

    /**
     * @param array<int, string> $allowedMimes
     * @return array{binary: string, mime: string}|null
     */
    private function decodeRasterImagePayload(string $payload, string $mimeHint, array $allowedMimes): ?array
    {
        $trimmed = trim($payload);
        if ($trimmed === '') {
            return null;
        }

        $mime = '';
        $b64 = $trimmed;

        if (str_starts_with(strtolower($trimmed), 'data:image/')) {
            if (!preg_match(
                '#^data:image/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$#i',
                $trimmed,
                $matches,
            )) {
                return null;
            }
            $mime = $this->normalizeMimeSubtype($matches[1]);
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
            $mime = $this->normalizeMimeSubtype($mimeHint);
            if ($mime === '') {
                $mime = $this->sniffRasterImageMime($binary) ?? '';
            }
        }

        if ($mime === '' || !in_array($mime, $allowedMimes, true)) {
            return null;
        }

        return ['binary' => $binary, 'mime' => $mime];
    }

    private function normalizeMimeSubtype(string $hint): string
    {
        $hint = strtolower(trim($hint));
        $hint = str_starts_with($hint, 'image/') ? substr($hint, 6) : $hint;

        return match ($hint) {
            'png' => 'image/png',
            'jpeg', 'jpg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => '',
        };
    }

    private function sniffRasterImageMime(string $binary): ?string
    {
        if (str_starts_with($binary, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }
        if (str_starts_with($binary, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        if (strlen($binary) >= 12 && substr($binary, 0, 4) === 'RIFF' && substr($binary, 8, 4) === 'WEBP') {
            return 'image/webp';
        }
        return null;
    }

    private function sanitizeImageFilename(string $preferred, string $mime): string
    {
        $ext = match ($mime) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
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

    /**
     * DataHandler requires a BackendUserAuthentication (cruser_id, isAdmin, FAL ACLs).
     * Middleware / API requests usually have none — init a synthetic admin BE user.
     */
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
}
