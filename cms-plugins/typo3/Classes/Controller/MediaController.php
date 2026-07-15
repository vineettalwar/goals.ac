<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use GoalsAc\Typo3\Helper\FalImporter;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class MediaController
{
    use ApiControllerTrait;

    /** Mirrors the SaaS raster media pipeline (PNG/JPEG uploads, WebP optimizer output). */
    private const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

    public function upload(ServerRequestInterface $request): ResponseInterface
    {
        $path = $this->requestPath($request);
        $auth = $this->verifyHmac($request, 'POST', $path);
        if ($auth !== true) {
            return $auth;
        }

        $body = json_decode($this->requestBody($request), true);
        if (!is_array($body)) {
            return new JsonResponse(['error' => 'invalid_json', 'message' => 'Request body must be valid JSON.'], 400);
        }

        $filename = trim((string)($body['filename'] ?? ''));
        $data = trim((string)($body['data'] ?? ''));
        if ($filename === '' || $data === '') {
            return new JsonResponse([
                'error' => 'missing_fields',
                'message' => 'filename and data (base64) are required.',
            ], 400);
        }

        $mimeType = trim((string)($body['mime_type'] ?? ''));

        try {
            $fal = new FalImporter();
            $fileUid = $fal->importBase64Image($data, $mimeType, $filename, self::ALLOWED_MIME_TYPES);
            if ($fileUid === null) {
                return new JsonResponse([
                    'error' => 'invalid_media',
                    'message' => 'Unsupported or invalid image data. Allowed types: PNG, JPEG, WebP.',
                ], 422);
            }

            $meta = [];
            $alt = trim((string)($body['alt'] ?? ''));
            $title = trim((string)($body['title'] ?? ''));
            $caption = trim((string)($body['caption'] ?? ''));
            if ($alt !== '') {
                $meta['alternative'] = $alt;
            }
            if ($title !== '') {
                $meta['title'] = $title;
            }
            if ($caption !== '') {
                $meta['description'] = $caption;
            }
            $fal->updateMetadata($fileUid, $meta);

            return new JsonResponse([
                'id' => $fileUid,
                'source_url' => $fal->publicUrlForUid($fileUid) ?? '',
            ], 201);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => 'media_upload_failed',
                'message' => 'Unable to upload media.',
                'requestId' => $this->requestId($request),
            ], 500);
        }
    }
}
