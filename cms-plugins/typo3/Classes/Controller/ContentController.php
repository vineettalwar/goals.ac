<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use GoalsAC\Shared\Contract;
use GoalsAc\Typo3\Helper\ContentPublisher;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class ContentController
{
    use ApiControllerTrait;

    public function publish(ServerRequestInterface $request): ResponseInterface
    {
        $path = $this->requestPath($request);
        $auth = $this->verifyHmac($request, 'POST', $path);
        if ($auth !== true) {
            return $auth;
        }

        $cached = $this->cachedIdempotentResponse($request);
        if ($cached !== null) {
            return $cached;
        }

        $body = json_decode($this->requestBody($request), true);
        if (!is_array($body)) {
            return new JsonResponse(['error' => 'invalid_json', 'message' => 'Request body must be valid JSON.'], 400);
        }

        $config = $this->extensionConfig();
        $parentPageUid = max(1, (int)($config['parentPageUid'] ?? 1));

        try {
            $publisher = new ContentPublisher();
            $result = $publisher->publish($body, $parentPageUid);
            $this->storeIdempotentResponse($request, $result);
            return new JsonResponse($result, 201);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => 'validation_error', 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => 'publish_failed',
                'message' => 'Unable to publish content.',
                'requestId' => $this->requestId($request),
            ], 500);
        }
    }
}
