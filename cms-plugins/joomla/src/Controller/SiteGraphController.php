<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 */

namespace GoalsAC\Joomla\Controller;

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Controller\BaseController;
use Joomla\CMS\Plugin\PluginHelper;
use GoalsAC\Shared\HMACAuth;
use GoalsAC\Joomla\Helper\JoomlaNonceStore;
use GoalsAC\Joomla\Helper\SiteGraph;

/**
 * GET /goals-ac/site-graph
 *
 * Exports the full site graph: articles, categories, tags, internal links.
 * Requires HMAC authentication.
 */
class SiteGraphController extends BaseController
{
    /**
     * Export the site graph.
     *
     * @return void
     */
    public function displayDefault(): void
    {
        $app    = Factory::getApplication();
        $params = PluginHelper::getPlugin('webservices', 'goalsac')->params ?? new \Joomla\Registry\Registry();

        // Authenticate if HMAC is enabled.
        if ((int) $params->get('hmac_enabled', 1) === 1) {
            $siteKey = (string) $params->get('site_key', '');
            $result  = $this->verifyHmac($app, $siteKey);

            if ($result !== true) {
                $app->sendResponse((object) [
                    'error'   => true,
                    'code'    => $result->code,
                    'message' => $result->message,
                ], $result->status);
                return;
            }
        }

        $helper   = new SiteGraph();
        $graph    = $helper->export();

        $app->sendResponse((object) $graph);
    }

    /**
     * Verify HMAC authentication headers on the inbound request.
     *
     * @param  \Joomla\CMS\Application\CMSApplication  $app
     * @param  string  $siteKey
     * @return true|\stdClass
     */
    private function verifyHmac($app, string $siteKey)
    {
        $request = [
            'method'    => $app->input->server->getString('REQUEST_METHOD', 'GET'),
            'path'      => $this->getRequestPath(),
            'timestamp' => $app->input->server->getString('HTTP_X_GOALS_TIMESTAMP', ''),
            'nonce'     => $app->input->server->getString('HTTP_X_GOALS_NONCE', ''),
            'signature' => $app->input->server->getString('HTTP_X_GOALS_SIGNATURE', ''),
            'body'      => $app->input->server->getString('rawInput', ''),
        ];

        $nonceStore = new JoomlaNonceStore();

        return HMACAuth::verify($request, $siteKey, $nonceStore);
    }

    /**
     * Reconstruct the request path from the Joomla application input.
     */
    private function getRequestPath(): string
    {
        $app    = Factory::getApplication();
        $route  = $app->input->server->getString('REQUEST_URI', '/');
        $parsed = parse_url($route);
        return $parsed['path'] ?? $route;
    }
}
