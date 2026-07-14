<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Middleware;

use GoalsAc\Typo3\Controller\ContentController;
use GoalsAc\Typo3\Controller\HealthController;
use GoalsAc\Typo3\Controller\SchemaController;
use GoalsAc\Typo3\Controller\SiteGraphController;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class ApiMiddleware implements MiddlewareInterface
{
    private const ROUTES = [
        'GET /goals-ac/v1/health' => [HealthController::class, 'index'],
        'GET /goals-ac/v1/site-graph' => [SiteGraphController::class, 'export'],
        'POST /goals-ac/v1/content' => [ContentController::class, 'publish'],
        'POST /goals-ac/v1/schema' => [SchemaController::class, 'store'],
    ];

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = rtrim($request->getUri()->getPath(), '/') ?: '/';
        $method = strtoupper($request->getMethod());
        $routeKey = $method . ' ' . $path;

        if (!isset(self::ROUTES[$routeKey])) {
            return $handler->handle($request);
        }

        [$class, $action] = self::ROUTES[$routeKey];
        /** @var HealthController|SiteGraphController|ContentController|SchemaController $controller */
        $controller = new $class();

        return $controller->{$action}($request);
    }
}
