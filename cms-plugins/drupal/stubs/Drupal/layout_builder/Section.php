<?php

declare(strict_types=1);

namespace Drupal\layout_builder;

class Section
{
    /**
     * @param array<string, mixed> $layout_settings
     */
    public function __construct(string $layout_id, array $layout_settings = [])
    {
    }

    public function appendComponent(SectionComponent $component): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class SectionComponent
{
    /**
     * @param array<string, mixed> $configuration
     * @param array<string, mixed> $additional
     */
    public function __construct(
        string $uuid,
        string $region,
        array $configuration = [],
        array $additional = [],
    ) {
    }
}
