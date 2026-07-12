<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 */

defined('_JEXEC') or die;

use Joomla\CMS\Extension\PluginInterface;
use Joomla\CMS\Factory;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;
use Joomla\Event\DispatcherInterface;
use GoalsAC\Joomla\Plugin\GoalsAcPlugin;

return new class implements ServiceProviderInterface {
    /**
     * Registers the plugin service in the DI container.
     */
    public function register(Container $container): void
    {
        $container->set(
            PluginInterface::class,
            static function (Container $container) {
                $dispatcher = $container->get(DispatcherInterface::class);

                $plugin = PluginHelper::getPlugin('webservices', 'goalsac');

                return new GoalsAcPlugin(
                    $dispatcher,
                    (array) $plugin
                );
            }
        );
    }
};
