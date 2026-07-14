<?php

declare(strict_types=1);

namespace Drupal\Core\State;

interface StateInterface
{
    /**
     * @return mixed
     */
    public function get(string $key);

    public function set(string $key, mixed $value): void;

    public function delete(string $key): void;
}
