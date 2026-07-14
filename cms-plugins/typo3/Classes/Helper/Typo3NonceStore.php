<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use GoalsAC\Shared\NonceStore;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class Typo3NonceStore implements NonceStore
{
    private const TABLE = 'tx_goalsac_nonces';

    public function seen(string $nonce): bool
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable(self::TABLE);
        $row = $connection->select(
            ['uid'],
            self::TABLE,
            ['nonce' => $nonce, 'expires_at' => ['>', time()]]
        )->fetchAssociative();

        return $row !== false;
    }

    public function store(string $nonce, int $expiresAt): void
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable(self::TABLE);
        try {
            $connection->insert(self::TABLE, [
                'nonce' => $nonce,
                'expires_at' => $expiresAt,
                'created_at' => time(),
            ]);
        } catch (\Throwable) {
            // Concurrent duplicate nonce insert — safe to ignore after seen() check.
        }

        if (random_int(1, 50) === 1) {
            $this->cleanup();
        }
    }

    public function cleanup(): void
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable(self::TABLE);
        $connection->delete(self::TABLE, ['expires_at' => ['<', time()]]);
    }
}
