<?php

declare(strict_types=1);

namespace Drupal\Core\Controller;

use Psr\Log\LoggerInterface;

abstract class ControllerBase
{
    /**
     * @param array<string, mixed> $context
     */
    protected function getLogger(string $channel): LoggerInterface
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    /**
     * @param array<string, string|int|float> $args
     */
    protected function t(string $string, array $args = []): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
