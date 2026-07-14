<?php

declare(strict_types=1);

namespace Drupal\Core\Routing;

interface RouteMatchInterface
{
    public function getRouteName(): ?string;
}
