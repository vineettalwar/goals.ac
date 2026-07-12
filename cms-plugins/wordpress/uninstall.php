<?php
/**
 * Uninstall goals.ac plugin.
 *
 * @package goals-ac
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

delete_option('goals_ac_site_key');
delete_option('goals_ac_schema_config');
delete_option('goals_ac_llms_txt');
delete_option('goals_ac_db_version');

global $wpdb;
$table = $wpdb->prefix . 'goals_ac_nonces';
// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query("DROP TABLE IF EXISTS {$table}");

wp_clear_scheduled_hook('goals_ac_cleanup_nonces');
