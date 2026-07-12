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
use GoalsAC\Shared\Contract;
use GoalsAC\Joomla\Helper\JoomlaNonceStore;
use GoalsAC\Joomla\Helper\SchemaInject;

/**
 * POST /goals-ac/schema
 *
 * Stores JSON-LD structured data and llms.txt content for injection
 * into the site. Requires HMAC authentication.
 */
class SchemaController extends BaseController
{
    /**
     * Store schema and llms.txt content.
     *
     * @return void
     */
    public function displayDefault(): void
    {
        $app    = Factory::getApplication();
        $params = PluginHelper::getPlugin('webservices', 'goalsac')->params ?? new \Joomla\Registry\Registry();

        // Check if schema injection is enabled.
        if ((int) $params->get('schema_enabled', 1) !== 1) {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'schema_disabled',
                'message' => 'Schema injection is disabled.',
            ], 403);
            return;
        }

        // Authenticate.
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

        // Parse body.
        $body = json_decode($app->input->server->getString('rawInput', '{}'), true);

        if (!is_array($body)) {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'invalid_body',
                'message' => 'Request body must be valid JSON.',
            ], 400);
            return;
        }

        $jsonLd   = $body['json_ld'] ?? null;
        $llmsTxt  = $body['llms_txt'] ?? null;

        if ($jsonLd === null && $llmsTxt === null) {
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'missing_fields',
                'message' => 'Provide at least one of: json_ld, llms_txt.',
            ], 400);
            return;
        }

        try {
            $helper = new SchemaInject();

            if ($jsonLd !== null) {
                $helper->setJsonLd($jsonLd);
            }

            if ($llmsTxt !== null) {
                $helper->setLlmsTxt($llmsTxt);
            }

            $app->sendResponse((object) [
                'success' => true,
                'message' => 'Schema content stored.',
            ]);
        } catch (\Throwable $e) {
            $requestId = $this->requestId($app);
            $app->getLogger()->error(sprintf(
                'goals.ac schema save failed [request_id=%s, exception=%s]: %s',
                $requestId,
                get_class($e),
                $e->getMessage()
            ));
            $app->sendResponse((object) [
                'error'   => true,
                'code'    => 'schema_save_failed',
                'message' => 'Unable to store schema configuration.',
                'requestId' => $requestId,
            ], 500);
        }
    }

    private function requestId($app): string
    {
        $supplied = $app->input->server->getString('HTTP_X_REQUEST_ID', '');
        return preg_match('/^[a-zA-Z0-9._-]{1,128}$/', $supplied)
            ? $supplied
            : bin2hex(random_bytes(16));
    }

    /**
     * Verify HMAC authentication headers.
     *
     * @param  \Joomla\CMS\Application\CMSApplication  $app
     * @param  string  $siteKey
     * @return true|\stdClass
     */
    private function verifyHmac($app, string $siteKey)
    {
        $request = [
            'method'    => $app->input->server->getString('REQUEST_METHOD', 'POST'),
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
     * Reconstruct the request path.
     */
    private function getRequestPath(): string
    {
        $app    = Factory::getApplication();
        $route  = $app->input->server->getString('REQUEST_URI', '/');
        $parsed = parse_url($route);
        return $parsed['path'] ?? $route;
    }
}
