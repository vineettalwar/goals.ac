<?php

declare(strict_types=1);

namespace Drupal\Core\Database;

use Drupal\Core\Database\Query\Delete;
use Drupal\Core\Database\Query\Insert;
use Drupal\Core\Database\Query\Merge;
use Drupal\Core\Database\Query\Select;

interface Connection
{
    public function select(string $table, ?string $alias = null): Select;

    public function insert(string $table): Insert;

    public function delete(string $table): Delete;

    public function merge(string $table): Merge;
}
