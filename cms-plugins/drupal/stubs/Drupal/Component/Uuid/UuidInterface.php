<?php

declare(strict_types=1);

namespace Drupal\Component\Uuid;

interface UuidInterface
{
    public function generate(): string;
}
