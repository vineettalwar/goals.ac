<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 *
 * Joomla Web Services plugin entry point. Registers REST API routes
 * for the goals.ac SaaS integration.
 */

defined('_JEXEC') or die;

use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Factory;

// Register the autoloader for PSR-4 namespaced classes.
$loaderFile = __DIR__ . '/vendor/autoload.php';
if (file_exists($loaderFile)) {
    require_once $loaderFile;
}

// PSR-4 fallback: map GoalsAC\Joomla namespace to src/ directory.
spl_autoload_register(static function (string $class): void {
    $prefix = 'GoalsAC\\Joomla\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});
