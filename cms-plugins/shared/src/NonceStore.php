<?php
/**
 * Nonce storage interface for HMAC replay protection.
 *
 * Each CMS plugin implements this interface using its native storage:
 * - WordPress: custom DB table via $wpdb
 * - Joomla: #__goals_ac_nonces table
 * - Drupal: key_value collection or custom table
 *
 * @package goals-ac/shared-contract
 */

namespace GoalsAC\Shared;

defined('ABSPATH') || defined('JOOMLA') || defined('DRUPAL') || exit;

interface NonceStore {

    /**
     * Check if a nonce has been seen within the freshness window.
     */
    public function seen(string $nonce): bool;

    /**
     * Store a nonce with its expiry time.
     *
     * @param string $nonce     The nonce value.
     * @param int    $expiresAt Unix timestamp when the nonce expires.
     */
    public function store(string $nonce, int $expiresAt): void;

    /**
     * Clean up expired nonces (called periodically via cron/scheduler).
     */
    public function cleanup(): void;
}
