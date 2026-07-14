<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

use GoalsAC\Shared\KeyStore;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

final class Typo3KeyStore implements KeyStore
{
    private const TABLE = 'tx_goalsac_idempotency';

    public function get(string $hash): ?array
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable(self::TABLE);
        $row = $connection->select(['value'], self::TABLE, ['key_hash' => $hash])->fetchAssociative();
        if ($row === false || empty($row['value'])) {
            return null;
        }

        $decoded = json_decode((string)$row['value'], true);
        return is_array($decoded) ? $decoded : null;
    }

    public function set(string $hash, array $value): void
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable(self::TABLE);
        $connection->delete(self::TABLE, ['key_hash' => $hash]);
        $connection->insert(self::TABLE, [
            'key_hash' => $hash,
            'value' => json_encode($value, JSON_THROW_ON_ERROR),
            'created_at' => time(),
        ]);
    }

    public function delete(string $hash): void
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable(self::TABLE);
        $connection->delete(self::TABLE, ['key_hash' => $hash]);
    }
}
