<?php

declare(strict_types=1);

return [
    'health' => [
        'path' => '/goals-ac/v1/health',
        'methods' => ['GET'],
        'controller' => GoalsAc\Typo3\Controller\HealthController::class,
        'action' => 'index',
    ],
    'content' => [
        'path' => '/goals-ac/v1/content',
        'methods' => ['POST'],
        'controller' => GoalsAc\Typo3\Controller\ContentController::class,
        'action' => 'publish',
    ],
    'siteGraph' => [
        'path' => '/goals-ac/v1/site-graph',
        'methods' => ['GET'],
        'controller' => GoalsAc\Typo3\Controller\SiteGraphController::class,
        'action' => 'export',
    ],
    'schema' => [
        'path' => '/goals-ac/v1/schema',
        'methods' => ['POST'],
        'controller' => GoalsAc\Typo3\Controller\SchemaController::class,
        'action' => 'store',
    ],
];
