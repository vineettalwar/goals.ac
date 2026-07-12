<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 */

namespace GoalsAC\Joomla\Plugin;

defined('_JEXEC') or die;

use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Router\ApiRouter;
use Joomla\Event\DispatcherInterface;
use Joomla\Event\SubscriberInterface;

/**
 * goals.ac Web Services plugin for Joomla.
 */
class GoalsAcPlugin extends CMSPlugin implements SubscriberInterface
{
    /**
     * Load the language files on instantiation.
     *
     * @var bool
     */
    protected $autoloadLanguage = true;

    /**
     * Disable legacy listener discovery for performance.
     *
     * @var bool
     */
    protected $allowLegacyListeners = false;

    /**
     * Constructor.
     */
    public function __construct(DispatcherInterface $dispatcher, array $config = [])
    {
        parent::__construct($dispatcher, $config);
    }

    /**
     * Declares subscribed events.
     *
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            'onBeforeApiRoute' => 'onBeforeApiRoute',
        ];
    }

    /**
     * Register API routes when Joomla initialises the Web Services API.
     */
    public function onBeforeApiRoute(ApiRouter $router): void
    {
        $component = 'goals-ac';

        $router->createCRUDRoutes($component . '/health', [
            'component'  => 'goals-ac',
            'controller' => 'HealthController',
            'action'     => 'displayDefault',
        ]);

        $router->createCRUDRoutes($component . '/site-graph', [
            'component'  => 'goals-ac',
            'controller' => 'SiteGraphController',
            'action'     => 'displayDefault',
        ]);

        $router->createCRUDRoutes($component . '/content', [
            'component'  => 'goals-ac',
            'controller' => 'ContentController',
            'action'     => 'displayDefault',
        ]);

        $router->createCRUDRoutes($component . '/schema', [
            'component'  => 'goals-ac',
            'controller' => 'SchemaController',
            'action'     => 'displayDefault',
        ]);
    }
}
