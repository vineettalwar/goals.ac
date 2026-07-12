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
use GoalsAC\Shared\KeyStore;

/**
 * Idempotency key storage backed by the Joomla database.
 *
 * Uses a dedicated `#__goals_ac_options` table to persist
 * idempotency results for the 24-hour window.
 */
class JoomlaKeyStore implements KeyStore
{
    /**
     * @var DatabaseDriver
     */
    private DatabaseDriver $db;

    /**
     * Table name.
     */
    private const TABLE = '#__goals_ac_options';

    public function __construct()
    {
        $this->db = Factory::getDbo();
        $this->ensureTable();
    }

    /**
     * Retrieve a stored value by key.
     */
    public function get(string $hash): ?array
    {
        $query = $this->db->getQuery(true)
            ->select($this->db->quoteName('value'))
            ->from(self::TABLE)
            ->where($this->db->quoteName('key_hash') . ' = ' . $this->db->quote($hash))
            ->setLimit(1);

        $json = $this->db->setQuery($query)->loadResult();

        if ($json === null || $json === '') {
            return null;
        }

        $decoded = json_decode((string) $json, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Store a value by key.
     */
    public function set(string $hash, array $value): void
    {
        $json = json_encode($value, JSON_THROW_ON_ERROR);

        // Upsert: delete first, then insert.
        $deleteQuery = $this->db->getQuery(true)
            ->delete(self::TABLE)
            ->where($this->db->quoteName('key_hash') . ' = ' . $this->db->quote($hash));

        $this->db->setQuery($deleteQuery)->execute();

        $row = [
            $this->db->quoteName('key_hash')    => $this->db->quote($hash),
            $this->db->quoteName('value')        => $this->db->quote($json),
            $this->db->quoteName('created_at')   => (int) time(),
        ];

        $insertQuery = $this->db->getQuery(true)
            ->insert(self::TABLE)
            ->columns(array_keys($row))
            ->values(array_values($row));

        $this->db->setQuery($insertQuery)->execute();
    }

    /**
     * Delete a stored value by key.
     */
    public function delete(string $hash): void
    {
        $query = $this->db->getQuery(true)
            ->delete(self::TABLE)
            ->where($this->db->quoteName('key_hash') . ' = ' . $this->db->quote($hash));

        $this->db->setQuery($query)->execute();
    }

    /**
     * Create the options table if it does not exist.
     */
    private function ensureTable(): void
    {
        $db    = $this->db;
        $table = $db->quoteName(self::TABLE);

        $query = $db->getQuery(true)
            ->select('COUNT(1)')
            ->from('information_schema.tables')
            ->where($db->quoteName('TABLE_SCHEMA') . ' = DATABASE()')
            ->where($db->quoteName('TABLE_NAME') . ' = ' . $db->quote($db->replacePrefix(self::TABLE)));

        $exists = (int) $db->setQuery($query)->loadResult();

        if ($exists > 0) {
            return;
        }

        $db->setQuery("
            CREATE TABLE IF NOT EXISTS {$table} (
                `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                `key_hash`   VARCHAR(32)     NOT NULL,
                `value`      LONGTEXT        NOT NULL,
                `created_at` INT UNSIGNED    NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_key_hash` (`key_hash`),
                KEY `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ")->execute();
    }
}
