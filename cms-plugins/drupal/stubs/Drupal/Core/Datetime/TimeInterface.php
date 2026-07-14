<?php

declare(strict_types=1);

namespace Drupal\Core\Datetime;

interface TimeInterface
{
    public function getRequestTime(): int;
}
