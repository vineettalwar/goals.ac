<?php
/**
 * WordPress implementation of GoalsAC\Shared\NonceStore.
 *
 * Uses the wp_{prefix}goals_ac_nonces custom table for HMAC replay protection.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined('ABSPATH') || exit;

class WP_Nonce_Store implements \GoalsAC\Shared\NonceStore {

    /**
     * Check if a nonce has been seen within the freshness window.
     */
    public function seen(string $nonce): bool {
        global $wpdb;

        $table  = $wpdb->prefix . 'goals_ac_nonces';
        $result = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE nonce = %s AND expires_at > %s",
                $nonce,
                gmdate('Y-m-d H:i:s')
            )
        );

        return intval($result) > 0;
    }

    /**
     * Store a nonce with its expiry time.
     *
     * @param string $nonce     The nonce value.
     * @param int    $expiresAt Unix timestamp when the nonce expires.
     */
    public function store(string $nonce, int $expiresAt): void {
        global $wpdb;

        $table      = $wpdb->prefix . 'goals_ac_nonces';
        $expires_at = gmdate('Y-m-d H:i:s', $expiresAt);

        $wpdb->replace($table, [
            'nonce'      => $nonce,
            'expires_at' => $expires_at,
        ]);
    }

    /**
     * Clean up expired nonces (called daily via WP-Cron).
     */
    public function cleanup(): void {
        global $wpdb;

        $table = $wpdb->prefix . 'goals_ac_nonces';
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table} WHERE expires_at < %s",
                gmdate('Y-m-d H:i:s')
            )
        );
    }

    /**
     * Create the nonces table on plugin activation.
     */
    public static function create_table(): void {
        global $wpdb;

        $table_name      = $wpdb->prefix . 'goals_ac_nonces';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            nonce varchar(64) NOT NULL,
            expires_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY nonce (nonce),
            KEY expires_at (expires_at)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }
}
