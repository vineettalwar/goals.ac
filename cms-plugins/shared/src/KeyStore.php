<?php
/**
 * Idempotency key storage interface.
 *
 * Each CMS plugin implements this using its native options/config storage:
 * - WordPress: wp_options with autoload=no
 * - Joomla: #__goals_ac_options or similar
 * - Drupal: key_value collection or state API
 *
 * @package goals-ac/shared-contract
 */

namespace GoalsAC\Shared;

defined('ABSPATH') || defined('JOOMLA') || defined('DRUPAL') || exit;

interface KeyStore {

    /**
     * Retrieve a stored value by key.
     *
     * @param string $hash MD5-hashed idempotency key.
     * @return array|null Stored result array, or null.
     */
    public function get(string $hash): ?array;

    /**
     * Store a value by key.
     *
     * @param string $hash  MD5-hashed idempotency key.
     * @param array  $value Result array to store.
     */
    public function set(string $hash, array $value): void;

    /**
     * Delete a stored value by key.
     */
    public function delete(string $hash): void;
}
