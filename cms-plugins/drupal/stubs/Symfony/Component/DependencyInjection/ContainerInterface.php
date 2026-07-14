<?php

declare(strict_types=1);

namespace Symfony\Component\DependencyInjection;

interface ContainerInterface
{
    /**
     * @return mixed
     */
    public function get(string $id): mixed;
}
