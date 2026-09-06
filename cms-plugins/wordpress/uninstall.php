<?php
/**
 * Uninstall goals.ac plugin.
 *
 * @package goals-ac
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'goals_ac_site_key' );
delete_option( 'goals_ac_schema_config' );
delete_option( 'goals_ac_llms_txt' );
delete_option( 'goals_ac_db_version' );
delete_option( 'goals_ac_author_id' );

global $wpdb;

// One goals_ac_idempotency_<hash> option per idempotency key ever seen
// (see WP_Key_Store::set()) — there is no index of the hashes to delete
// individually, so find them the same way WP_Key_Store looks them up:
// by option name prefix.
// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$idempotency_options = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
		$wpdb->esc_like( 'goals_ac_idempotency_' ) . '%'
	)
);
foreach ( (array) $idempotency_options as $option_name ) {
	delete_option( $option_name );
}

$table = $wpdb->prefix . 'goals_ac_nonces';
// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query( "DROP TABLE IF EXISTS {$table}" );

wp_clear_scheduled_hook( 'goals_ac_cleanup_nonces' );
