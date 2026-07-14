<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\Database;

class Connection
{
    /**
     * @param array<int|string, mixed> $criteria
     */
    public function select(array $fields, string $table, array $criteria): Result
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    /**
     * @param array<string, mixed> $data
     */
    public function insert(string $table, array $data): void
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    /**
     * @param array<string, mixed> $criteria
     */
    public function delete(string $table, array $criteria): void
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
