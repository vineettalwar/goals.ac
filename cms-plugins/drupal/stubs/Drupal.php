<?php

declare(strict_types=1);

use Drupal\Core\Datetime\TimeInterface;
use Drupal\Core\State\StateInterface;
use Symfony\Component\HttpFoundation\Request;

/**
 * IDE stubs for Drupal static helpers — not loaded at runtime.
 */
final class Drupal
{
    public const VERSION = '10.0.0';

    public static function time(): TimeInterface
    {
        throw new BadMethodCallException('IDE stub only.');
    }

    public static function state(): StateInterface
    {
        throw new BadMethodCallException('IDE stub only.');
    }

    public static function request(): Request
    {
        throw new BadMethodCallException('IDE stub only.');
    }

    /**
     * @return mixed
     */
    public static function service(string $id): mixed
    {
        throw new BadMethodCallException('IDE stub only.');
    }
}
