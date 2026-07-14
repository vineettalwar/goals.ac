<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use GoalsAc\Typo3\Helper\SchemaInject;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class SchemaController
{
    use ApiControllerTrait;

    public function store(ServerRequestInterface $request): ResponseInterface
    {
        $path = $this->requestPath($request);
        $auth = $this->verifyHmac($request, 'POST', $path);
        if ($auth !== true) {
            return $auth;
        }

        $body = json_decode((string)$request->getBody(), true);
        if (!is_array($body)) {
            return new JsonResponse(['error' => 'invalid_json', 'message' => 'Request body must be valid JSON.'], 400);
        }

        $jsonLd = $body['json_ld'] ?? null;
        $llmsTxt = isset($body['llms_txt']) ? (string)$body['llms_txt'] : null;
        if ($jsonLd === null && $llmsTxt === null) {
            return new JsonResponse([
                'error' => 'missing_fields',
                'message' => 'Provide at least one of: json_ld, llms_txt.',
            ], 400);
        }

        try {
            $result = (new SchemaInject())->store($jsonLd, $llmsTxt);
            return new JsonResponse([
                'status' => 'stored',
                'json_ld_stored' => $jsonLd !== null,
                'llms_txt_stored' => $llmsTxt !== null,
                'path' => $result['path'],
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => 'schema_store_failed',
                'message' => 'Unable to store schema configuration.',
                'requestId' => $this->requestId($request),
            ], 500);
        }
    }
}
