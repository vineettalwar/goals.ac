<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Middleware;

use GoalsAc\Typo3\Controller\ContentController;
use GoalsAc\Typo3\Controller\HealthController;
use GoalsAc\Typo3\Controller\MediaController;
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
        'POST /goals-ac/v1/media' => [MediaController::class, 'upload'],
    ];

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = $request->getUri()->getPath();
        if (!str_starts_with($path, '/goals-ac/')) {
            return $handler->handle($request);
        }

        $path = rtrim($path, '/') ?: '/';
        $method = strtoupper($request->getMethod());
        $routeKey = $method . ' ' . $path;

        if (!isset(self::ROUTES[$routeKey])) {
            return $handler->handle($request);
        }

        $rawBody = (string)$request->getBody();
        if (method_exists($request, 'withAttribute')) {
            $request = $request->withAttribute('goals_ac_request_body', $rawBody);
        }

        [$class, $action] = self::ROUTES[$routeKey];
        /** @var HealthController|SiteGraphController|ContentController|SchemaController|MediaController $controller */
        $controller = new $class();

        return $controller->{$action}($request);
    }
}
