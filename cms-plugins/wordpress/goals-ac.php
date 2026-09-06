<?php
/**
 * Plugin Name: goals.ac
 * Plugin URI: https://goals.ac
 * Description: Connect your WordPress site to goals.ac — receive AI-generated content, inject schema.org and llms.txt for GEO, and export your site graph for internal linking.
 * Version: 0.1.0
 * Author: goals.ac
 * Author URI: https://goals.ac
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: goals-ac
 * Domain Path: /languages
 * Requires at least: 6.4
 * Requires PHP: 8.1
 */

defined( 'ABSPATH' ) || exit;

define( 'GOALS_AC_VERSION', '0.1.0' );
define( 'GOALS_AC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GOALS_AC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'GOALS_AC_OPTION_KEY', 'goals_ac_settings' );
define( 'GOALS_AC_NONCE_EXPIRY', 300 ); // 5 minutes

/**
 * Autoload local Goals_AC classes (includes/) and shared library classes.
 *
 * Priority:
 * 1. Composer autoload (GoalsAC\Shared\*) — loaded via vendor/autoload.php
 * 2. Local spl_autoload for Goals_AC\* — maps to includes/class-*.php
 */
spl_autoload_register(
	function ( $classname ) {
		$prefix   = 'Goals_AC\\';
		$base_dir = GOALS_AC_PLUGIN_DIR . 'includes/';

		$len = strlen( $prefix );
		if ( strncmp( $prefix, $classname, $len ) !== 0 ) {
			return;
		}

		$relative_class = substr( $classname, $len );
		$file           = $base_dir . 'class-' . strtolower( str_replace( '_', '-', $relative_class ) ) . '.php';

		if ( file_exists( $file ) ) {
			require $file;
		}
	}
);

// Load Composer autoload if available (provides GoalsAC\Shared\* classes).
$autoload_file = GOALS_AC_PLUGIN_DIR . 'vendor/autoload.php';
if ( file_exists( $autoload_file ) ) {
	require_once $autoload_file;
}

/**
 * Initialize the plugin (admin + frontend hooks).
 */
function goals_ac_init(): void {
	$schema_inject = new Goals_AC\Schema_Inject();
	$schema_inject->init();
}
add_action( 'plugins_loaded', 'goals_ac_init' );

/**
 * Register REST routes and cron on rest_api_init.
 */
function goals_ac_register_rest(): void {
	static $registered = false;
	if ( $registered ) {
		return;
	}
	$registered = true;

	$nonce_store = new Goals_AC\WP_Nonce_Store();
	$key_store   = new Goals_AC\WP_Key_Store();

	$rest_api = new Goals_AC\Rest_API( $nonce_store, $key_store );
	$rest_api->register_routes();
	$rest_api->register_maintenance();
}
add_action( 'rest_api_init', 'goals_ac_register_rest' );

/**
 * Activation: create nonce table and schedule cleanup.
 */
function goals_ac_activate(): void {
	Goals_AC\WP_Nonce_Store::create_table();
	update_option( 'goals_ac_db_version', GOALS_AC_VERSION );
	goals_ac_site_key(); // Generate now, so viewing the settings page is a plain read.

	if ( ! wp_next_scheduled( 'goals_ac_cleanup_nonces' ) ) {
		wp_schedule_event( time(), 'daily', 'goals_ac_cleanup_nonces' );
	}

	// The /llms.txt rule is registered on every request (see Schema_Inject::init()),
	// but the rewrite rule cache only picks it up after a flush. That flush belongs
	// here — on activation/deactivation — never on a normal page load.
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'goals_ac_activate' );

/**
 * Deactivation: clear scheduled events.
 */
function goals_ac_deactivate(): void {
	wp_clear_scheduled_hook( 'goals_ac_cleanup_nonces' );
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'goals_ac_deactivate' );

/**
 * Add settings link on the Plugins page.
 *
 * @param array<int, string> $links Plugin action links.
 * @return array<int, string>
 */
function goals_ac_plugin_action_links( $links ): array {
	$settings_link = '<a href="' . esc_url( admin_url( 'options-general.php?page=goals-ac' ) ) . '">' . __( 'Settings', 'goals-ac' ) . '</a>';
	array_unshift( $links, $settings_link );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'goals_ac_plugin_action_links' );

/**
 * Admin menu for settings page.
 */
function goals_ac_admin_menu(): void {
	add_options_page(
		'goals.ac',
		'goals.ac',
		'manage_options',
		'goals-ac',
		'goals_ac_settings_page'
	);
}
add_action( 'admin_menu', 'goals_ac_admin_menu' );

/**
 * Render the settings page.
 */
function goals_ac_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'goals-ac' ) );
	}

	$site_key = get_option( 'goals_ac_site_key', '' );
	?>
	<div class="wrap">
		<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
		<form method="post" action="options.php">
			<?php
			settings_fields( 'goals_ac' );
			do_settings_sections( 'goals-ac' );
			submit_button();
			?>
		</form>
		<h2><?php esc_html_e( 'Connection Info', 'goals-ac' ); ?></h2>
		<p><?php esc_html_e( 'Use this site key when pairing your site with the goals.ac dashboard.', 'goals-ac' ); ?></p>
		<code><?php echo esc_html( $site_key ? $site_key : __( 'Not yet generated — save settings to generate.', 'goals-ac' ) ); ?></code>
	</div>
	<?php
}

/**
 * Register plugin settings.
 */
function goals_ac_register_settings(): void {
	register_setting(
		'goals_ac',
		'goals_ac_site_key',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'goals_ac_sanitize_site_key',
			'default'           => '',
		)
	);

	add_settings_section(
		'goals_ac_connection',
		__( 'Connection', 'goals-ac' ),
		function () {
			echo '<p>' . esc_html__( 'Configure the connection to your goals.ac workspace.', 'goals-ac' ) . '</p>';
		},
		'goals-ac'
	);

	register_setting(
		'goals_ac',
		'goals_ac_author_id',
		array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		)
	);

	add_settings_field(
		'goals_ac_author_id',
		__( 'Publish as', 'goals-ac' ),
		function () {
			$selected = \intval( get_option( 'goals_ac_author_id', 0 ) );
			$users    = get_users( array( 'capability' => 'edit_posts', 'orderby' => 'display_name' ) );
			echo '<select name="goals_ac_author_id">';
			echo '<option value="0">' . esc_html__( '(default) first administrator', 'goals-ac' ) . '</option>';
			foreach ( $users as $user ) {
				printf(
					'<option value="%d"%s>%s</option>',
					(int) $user->ID,
					selected( $selected, (int) $user->ID, false ),
					esc_html( $user->display_name )
				);
			}
			echo '</select>';
			echo '<p class="description">' . esc_html__( 'WordPress author assigned to posts published by goals.ac.', 'goals-ac' ) . '</p>';
		},
		'goals-ac',
		'goals_ac_connection'
	);

	add_settings_field(
		'goals_ac_site_key',
		__( 'Site Key', 'goals-ac' ),
		function () {
			$key = goals_ac_site_key();
			echo '<code>' . esc_html( $key ) . '</code>';
			echo '<p class="description">' . esc_html__( 'This key is used to authenticate requests from goals.ac. Keep it secret.', 'goals-ac' ) . '</p>';
		},
		'goals-ac',
		'goals_ac_connection'
	);
}
add_action( 'admin_init', 'goals_ac_register_settings' );

/**
 * Get the site key, generating one on first use.
 *
 * Rendering a settings field is a GET-style admin view — it must not have
 * the side effect of writing to the database. The key is generated once,
 * on activation (see `goals_ac_activate()`), and lazily here only as a
 * fallback for sites that already ran the plugin before that existed.
 */
function goals_ac_site_key(): string {
	$key = get_option( 'goals_ac_site_key', '' );
	if ( empty( $key ) ) {
		$key = wp_generate_password( 32, false );
		update_option( 'goals_ac_site_key', $key );
	}
	return $key;
}

/**
 * Sanitize and generate site key.
 *
 * @param mixed $input Raw settings input.
 */
function goals_ac_sanitize_site_key( $input ): string {
	if ( empty( $input ) ) {
		return wp_generate_password( 32, false );
	}
	return sanitize_text_field( $input );
}
