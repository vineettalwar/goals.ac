<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class HealthController
{
    public function index(): ResponseInterface
    {
        return new JsonResponse([
            'version' => '0.1.0',
            'cms_version' => TYPO3_version,
            'capabilities' => [
                'drafts' => true,
                'scheduling' => false,
                'updates' => true,
                'categories' => true,
                'tags' => true,
                'featured_image' => true,
                'schema_injection' => true,
            ],
        ]);
    }
}
