<?php

declare(strict_types=1);

namespace Drupal\Core\Database\Query;

interface StatementInterface
{
    /**
     * @return object|false
     */
    public function fetchObject(): object|false;
}

class Select
{
    /**
     * @param array<int, string> $fields
     */
    public function fields(string $table_alias, array $fields = []): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function condition(string $field, mixed $value, ?string $operator = null): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function range(int $start, ?int $length = null): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function execute(): StatementInterface
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class Insert
{
    /**
     * @param array<string, mixed> $fields
     */
    public function fields(array $fields): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function execute(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class Delete
{
    public function condition(string $field, mixed $value, ?string $operator = null): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function execute(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class Merge
{
    /**
     * @param array<string, mixed> $keys
     */
    public function keys(array $keys): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    /**
     * @param array<string, mixed> $fields
     */
    public function fields(array $fields): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function execute(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
