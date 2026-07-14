<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\Database;

class ConnectionPool
{
    public function getConnectionForTable(string $table): Connection
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
