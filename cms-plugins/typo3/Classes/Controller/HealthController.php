<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use GoalsAC\Shared\Contract;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class HealthController
{
    public function index(ServerRequestInterface $request): ResponseInterface
    {
        return new JsonResponse(
            Contract::healthResponse(TYPO3_version, [
                'cms' => 'typo3',
                'output_modes' => ['body_text', 'content_elements'],
                'recommended_output_mode' => 'body_text',
                'content_element_types' => ['header', 'text', 'textmedia'],
                'endpoints' => [
                    'site_graph' => '/goals-ac/v1/site-graph',
                    'content' => '/goals-ac/v1/content',
                    'schema' => '/goals-ac/v1/schema',
                ],
            ])
        );
    }
}
