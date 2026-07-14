<?php

declare(strict_types=1);

namespace Drupal\Core\Config;

interface ConfigFactoryInterface
{
    public function get(string $name): ImmutableConfig;
}
