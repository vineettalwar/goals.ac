<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\Database;

class Result
{
    /**
     * @return array<string, mixed>|false
     */
    public function fetchAssociative(): array|false
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function fetchAllAssociative(): array
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
