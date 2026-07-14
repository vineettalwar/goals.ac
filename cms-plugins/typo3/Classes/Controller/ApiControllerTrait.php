<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use GoalsAC\Shared\HMACAuth;
use GoalsAC\Shared\Idempotency;
use GoalsAc\Typo3\Helper\Typo3KeyStore;
use GoalsAc\Typo3\Helper\Typo3NonceStore;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Utility\GeneralUtility;

use function bin2hex;
use function random_bytes;

trait ApiControllerTrait
{
    protected function extensionConfig(): array
    {
        try {
            $config = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get('goals_ac');
            return is_array($config) ? $config : [];
        } catch (\Throwable) {
            return [];
        }
    }

    protected function siteKey(): string
    {
        return (string)($this->extensionConfig()['siteKey'] ?? '');
    }

    protected function requestPath(ServerRequestInterface $request): string
    {
        $path = $request->getUri()->getPath();
        return $path !== '' ? $path : '/';
    }

    protected function requestId(ServerRequestInterface $request): string
    {
        $supplied = $request->getHeaderLine('X-Request-ID');
        if (\is_string($supplied) && \preg_match('/^[a-zA-Z0-9._-]{1,128}$/', $supplied)) {
            return $supplied;
        }

        return bin2hex(random_bytes(16));
    }

    /**
     * @return true|ResponseInterface
     */
    protected function verifyHmac(ServerRequestInterface $request, string $method, string $path): true|ResponseInterface
    {
        $siteKey = $this->siteKey();
        if ($siteKey === '') {
            return new JsonResponse(['error' => 'no_key', 'message' => 'Site key not configured.'], 500);
        }

        $result = HMACAuth::verify([
            'method' => $method,
            'path' => $path,
            'timestamp' => $request->getHeaderLine(HMACAuth::TIMESTAMP_HEADER),
            'nonce' => $request->getHeaderLine(HMACAuth::NONCE_HEADER),
            'signature' => $request->getHeaderLine(HMACAuth::SIGNATURE_HEADER),
            'body' => (string)$request->getBody(),
        ], $siteKey, new Typo3NonceStore());

        if ($result === true) {
            return true;
        }

        return new JsonResponse([
            'error' => $result->code ?? 'auth_failed',
            'message' => $result->message ?? 'Authentication failed.',
        ], $result->status ?? 401);
    }

    protected function idempotencyKey(ServerRequestInterface $request): string
    {
        return $request->getHeaderLine(Idempotency::KEY_HEADER);
    }

    protected function cachedIdempotentResponse(ServerRequestInterface $request): ?ResponseInterface
    {
        $cached = Idempotency::check($this->idempotencyKey($request), new Typo3KeyStore());
        if ($cached === null) {
            return null;
        }

        return new JsonResponse($cached);
    }

    /**
     * @param array<string, mixed> $result
     */
    protected function storeIdempotentResponse(ServerRequestInterface $request, array $result): void
    {
        Idempotency::store($this->idempotencyKey($request), $result, new Typo3KeyStore());
    }
}
