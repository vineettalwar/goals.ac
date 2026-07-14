<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Controller;

use GoalsAc\Typo3\Helper\SiteGraph;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class SiteGraphController
{
    use ApiControllerTrait;

    public function export(ServerRequestInterface $request): ResponseInterface
    {
        $path = $this->requestPath($request);
        $auth = $this->verifyHmac($request, 'GET', $path);
        if ($auth !== true) {
            return $auth;
        }

        try {
            $graph = (new SiteGraph())->export();
            return new JsonResponse($graph);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => 'site_graph_failed',
                'message' => 'Unable to export site graph.',
                'requestId' => $this->requestId($request),
            ], 500);
        }
    }
}
