<?php

declare(strict_types=1);

namespace Drupal\path_alias;

interface AliasManagerInterface
{
    public function getPathByAlias(string $alias, ?string $langcode = null): string;
}
