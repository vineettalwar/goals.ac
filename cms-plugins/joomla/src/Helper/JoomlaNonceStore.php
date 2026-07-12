<?php
/**
 * @package     GoalsAC Joomla Plugin
 * @subpackage  webservices.goalsac
 *
 * @copyright   Copyright (c) 2024 goals.ac
 * @license     GPL-2.0-or-later
 */

namespace GoalsAC\Joomla\Helper;

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\Database\DatabaseDriver;
use GoalsAC\Shared\NonceStore;

/**
 * HMAC nonce storage backed by the Joomla database.
 *
 * Uses a dedicated `#__goals_ac_nonces` table. The table is created
 * automatically on first use if it does not exist.
 */
class JoomlaNonceStore implements NonceStore
{
    /**
     * @var DatabaseDriver
     */
    private DatabaseDriver $db;

    /**
     * Table name (with prefix placeholder).
     */
    private const TABLE = '#__goals_ac_nonces';

    public function __construct()
    {
        $this->db = Factory::getDbo();
        $this->ensureTable();
    }

    /**
     * Check if a nonce has been seen within the freshness window.
     */
    public function seen(string $nonce): bool
    {
        $query = $this->db->getQuery(true)
            ->select('1')
            ->from(self::TABLE)
            ->where($this->db->quoteName('nonce') . ' = ' . $this->db->quote($nonce))
            ->where($this->db->quoteName('expires_at') . ' > ' . (int) time())
            ->setLimit(1);

        return (bool) $this->db->setQuery($query)->loadResult();
    }

    /**
     * Store a nonce with its expiry time.
     */
    public function store(string $nonce, int $expiresAt): void
    {
        $row = [
            $this->db->quoteName('nonce')      => $this->db->quote($nonce),
            $this->db->quoteName('expires_at') => (int) $expiresAt,
            $this->db->quoteName('created_at') => (int) time(),
        ];

        $query = $this->db->getQuery(true)
            ->insert(self::TABLE)
            ->columns(array_keys($row))
            ->values(array_values($row));

        $this->db->setQuery($query)->execute();
    }

    /**
     * Clean up expired nonces.
     */
    public function cleanup(): void
    {
        $query = $this->db->getQuery(true)
            ->delete(self::TABLE)
            ->where($this->db->quoteName('expires_at') . ' < ' . (int) time());

        $this->db->setQuery($query)->execute();
    }

    /**
     * Create the nonce table if it does not exist.
     *
     * This is a safe idempotent operation — Joomla's TableCreationSQL
     * is only used on first install; subsequent calls are no-ops.
     */
    private function ensureTable(): void
    {
        $db    = $this->db;
        $table = $db->quoteName(self::TABLE);

        // Check if the table already exists.
        $query = $db->getQuery(true)
            ->select('COUNT(1)')
            ->from('information_schema.tables')
            ->where($db->quoteName('TABLE_SCHEMA') . ' = DATABASE()')
            ->where($db->quoteName('TABLE_NAME') . ' = ' . $db->quote($db->replacePrefix(self::TABLE)));

        $exists = (int) $db->setQuery($query)->loadResult();

        if ($exists > 0) {
            return;
        }

        // Create the table.
        $db->setQuery("
            CREATE TABLE IF NOT EXISTS {$table} (
                `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                `nonce`      VARCHAR(64)     NOT NULL,
                `expires_at` INT UNSIGNED    NOT NULL,
                `created_at` INT UNSIGNED    NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_nonce` (`nonce`),
                KEY `idx_expires_at` (`expires_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ")->execute();
    }
}
