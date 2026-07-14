<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\Http;

use Psr\Http\Message\ResponseInterface;

class JsonResponse implements ResponseInterface
{
    /**
     * @param array<string, mixed>|array<int, mixed> $data
     */
    public function __construct(array $data, int $statusCode = 200)
    {
    }
}
