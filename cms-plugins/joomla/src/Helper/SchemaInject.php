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
use Joomla\CMS\Plugin\PluginHelper;

/**
 * Stores and serves JSON-LD structured data and llms.txt content.
 *
 * Uses the Joomla plugin params storage (via the plugin's own params table row)
 * to persist the schema content. This avoids needing an extra database table
 * while keeping the data accessible to template overrides and the system plugin
 * that injects the content into page output.
 */
class SchemaInject
{
    /**
     * Plugin parameter keys.
     */
    private const KEY_JSON_LD   = 'goalsac_json_ld';
    private const KEY_LLMS_TXT  = 'goalsac_llms_txt';

    /**
     * Store JSON-LD structured data.
     *
     * @param  array|string  $jsonLd  The JSON-LD data (array or already-encoded string).
     * @return void
     * @throws \RuntimeException
     */
    public function setJsonLd($jsonLd): void
    {
        if (is_array($jsonLd)) {
            $encoded = json_encode($jsonLd, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        } else {
            $encoded = (string) $jsonLd;
            // Validate it's valid JSON.
            json_decode($encoded, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \RuntimeException('Invalid JSON-LD: ' . json_last_error_msg());
            }
        }

        $this->storeParam(self::KEY_JSON_LD, $encoded);
    }

    /**
     * Get stored JSON-LD.
     *
     * @return array|null  Decoded JSON-LD array, or null.
     */
    public function getJsonLd(): ?array
    {
        $raw = $this->getParam(self::KEY_JSON_LD);

        if ($raw === null || $raw === '') {
            return null;
        }

        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Store llms.txt content.
     *
     * @param  string  $content  The llms.txt content.
     * @return void
     */
    public function setLlmsTxt(string $content): void
    {
        $this->storeParam(self::KEY_LLMS_TXT, $content);
    }

    /**
     * Get stored llms.txt content.
     *
     * @return string|null
     */
    public function getLlmsTxt(): ?string
    {
        $raw = $this->getParam(self::KEY_LLMS_TXT);

        return ($raw !== null && $raw !== '') ? (string) $raw : null;
    }

    /**
     * Store a parameter value in the goals_ac_options table.
     *
     * Uses the same table as JoomlaKeyStore for consistency.
     *
     * @param  string  $key
     * @param  string  $value
     * @return void
     */
    private function storeParam(string $key, string $value): void
    {
        $db = Factory::getDbo();

        // Ensure the table exists.
        $this->ensureTable($db);

        $hash = md5('schema_' . $key);

        // Upsert.
        $deleteQuery = $db->getQuery(true)
            ->delete('#__goals_ac_options')
            ->where($db->quoteName('key_hash') . ' = ' . $db->quote($hash));

        $db->setQuery($deleteQuery)->execute();

        $data = json_encode(['key' => $key, 'value' => $value], JSON_THROW_ON_ERROR);

        $row = [
            $db->quoteName('key_hash')    => $db->quote($hash),
            $db->quoteName('value')        => $db->quote($data),
            $db->quoteName('created_at')   => (int) time(),
        ];

        $insertQuery = $db->getQuery(true)
            ->insert('#__goals_ac_options')
            ->columns(array_keys($row))
            ->values(array_values($row));

        $db->setQuery($insertQuery)->execute();
    }

    /**
     * Retrieve a parameter value from the goals_ac_options table.
     *
     * @param  string  $key
     * @return string|null
     */
    private function getParam(string $key): ?string
    {
        $db   = Factory::getDbo();
        $hash = md5('schema_' . $key);

        $query = $db->getQuery(true)
            ->select($db->quoteName('value'))
            ->from('#__goals_ac_options')
            ->where($db->quoteName('key_hash') . ' = ' . $db->quote($hash))
            ->setLimit(1);

        $json = $db->setQuery($query)->loadResult();

        if ($json === null || $json === '') {
            return null;
        }

        $decoded = json_decode((string) $json, true);

        return ($decoded !== null && isset($decoded['value'])) ? (string) $decoded['value'] : null;
    }

    /**
     * Ensure the goals_ac_options table exists.
     *
     * @param  \Joomla\Database\DatabaseDriver  $db
     * @return void
     */
    private function ensureTable($db): void
    {
        $table = $db->quoteName('#__goals_ac_options');

        $query = $db->getQuery(true)
            ->select('COUNT(1)')
            ->from('information_schema.tables')
            ->where($db->quoteName('TABLE_SCHEMA') . ' = DATABASE()')
            ->where($db->quoteName('TABLE_NAME') . ' = ' . $db->quote($db->replacePrefix('#__goals_ac_options')));

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
