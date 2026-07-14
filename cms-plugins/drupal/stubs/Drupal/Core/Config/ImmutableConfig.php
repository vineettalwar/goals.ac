<?php

declare(strict_types=1);

namespace Drupal\Core\Config;

class ImmutableConfig
{
    /**
     * @return mixed
     */
    public function get(string $key)
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function set(string $key, mixed $value): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function save(): bool
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
