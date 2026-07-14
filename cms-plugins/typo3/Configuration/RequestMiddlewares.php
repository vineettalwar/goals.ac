<?php

declare(strict_types=1);

use GoalsAc\Typo3\Middleware\ApiMiddleware;

return [
    'goals-ac/api' => [
        'target' => ApiMiddleware::class,
        'before' => [
            'typo3/cms-frontend/prepare',
        ],
        'after' => [
            'typo3/cms-frontend/authentication',
        ],
    ],
];
