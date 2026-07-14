<?php

declare(strict_types=1);

namespace Drupal\Core\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerInterface;

interface ContainerInjectionInterface
{
    public static function create(ContainerInterface $container): static;
}
