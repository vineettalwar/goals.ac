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
use Joomla\CMS\Version;
use GoalsAC\Shared\Contract;

/**
 * GET /goals-ac/health
 *
 * Returns plugin version, CMS version, and capability flags.
 * No authentication required.
 */
class HealthController extends BaseController
{
    /**
     * Display the health/capability response.
     *
     * @return void
     */
    public function displayDefault(): void
    {
        $app      = Factory::getApplication();
        $version  = new Version();
        $cmsVer   = $version->getShortVersion();

        $response = Contract::healthResponse($cmsVer, [
            'plugin' => 'goalsac',
            'name'   => 'goals.ac Joomla Integration',
        ]);

        $app->sendResponse((object) $response);
    }
}
