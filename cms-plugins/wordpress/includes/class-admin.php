<?php
/**
 * Admin settings UI for the goals.ac plugin.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the settings page, Settings API fields, and Plugins-row link.
 */
class Admin {

	/**
	 * Wire admin hooks. Call only when `is_admin()` is true.
	 */
	public function init(): void {
		\add_action( 'admin_menu', array( $this, 'register_menu' ) );
		\add_action( 'admin_init', array( $this, 'register_settings' ) );
		\add_filter(
			'plugin_action_links_' . \plugin_basename( GOALS_AC_PLUGIN_FILE ),
			array( $this, 'plugin_action_links' )
		);
	}

	/**
	 * Add Settings link on the Plugins page.
	 *
	 * @param array<int, string> $links Plugin action links.
	 * @return array<int, string>
	 */
	public function plugin_action_links( array $links ): array {
		$settings_link = '<a href="' . \esc_url( \admin_url( 'options-general.php?page=goals-ac' ) ) . '">' . \__( 'Settings', 'goals-ac' ) . '</a>';
		\array_unshift( $links, $settings_link );
		return $links;
	}

	/**
	 * Register the options page under Settings.
	 */
	public function register_menu(): void {
		\add_options_page(
			'goals.ac',
			'goals.ac',
			'manage_options',
			'goals-ac',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Render the settings page.
	 */
	public function render_settings_page(): void {
		if ( ! \current_user_can( 'manage_options' ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'goals-ac' ) );
		}

		$site_key = \get_option( 'goals_ac_site_key', '' );
		?>
		<div class="wrap">
			<h1><?php echo \esc_html( \get_admin_page_title() ); ?></h1>
			<form method="post" action="options.php">
				<?php
				\settings_fields( 'goals_ac' );
				\do_settings_sections( 'goals-ac' );
				\submit_button();
				?>
			</form>
			<h2><?php \esc_html_e( 'Connection Info', 'goals-ac' ); ?></h2>
			<p><?php \esc_html_e( 'Use this site key when pairing your site with the goals.ac dashboard.', 'goals-ac' ); ?></p>
			<code><?php echo \esc_html( $site_key ? $site_key : \__( 'Not yet generated — save settings to generate.', 'goals-ac' ) ); ?></code>
		</div>
		<?php
	}

	/**
	 * Register plugin settings and fields.
	 */
	public function register_settings(): void {
		\register_setting(
			'goals_ac',
			'goals_ac_site_key',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'goals_ac_sanitize_site_key',
				'default'           => '',
			)
		);

		\add_settings_section(
			'goals_ac_connection',
			\__( 'Connection', 'goals-ac' ),
			static function () {
				echo '<p>' . \esc_html__( 'Configure the connection to your goals.ac workspace.', 'goals-ac' ) . '</p>';
			},
			'goals-ac'
		);

		\register_setting(
			'goals_ac',
			'goals_ac_author_id',
			array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'default'           => 0,
			)
		);

		\add_settings_field(
			'goals_ac_author_id',
			\__( 'Publish as', 'goals-ac' ),
			array( $this, 'render_author_field' ),
			'goals-ac',
			'goals_ac_connection'
		);

		\add_settings_field(
			'goals_ac_site_key',
			\__( 'Site Key', 'goals-ac' ),
			array( $this, 'render_site_key_field' ),
			'goals-ac',
			'goals_ac_connection'
		);
	}

	/**
	 * Render the "Publish as" author select.
	 */
	public function render_author_field(): void {
		$selected = \intval( \get_option( 'goals_ac_author_id', 0 ) );
		$users    = \get_users(
			array(
				'capability' => 'edit_posts',
				'orderby'    => 'display_name',
			)
		);
		echo '<select name="goals_ac_author_id">';
		echo '<option value="0">' . \esc_html__( '(default) first administrator', 'goals-ac' ) . '</option>';
		foreach ( $users as $user ) {
			printf(
				'<option value="%d"%s>%s</option>',
				(int) $user->ID,
				\selected( $selected, (int) $user->ID, false ),
				\esc_html( $user->display_name )
			);
		}
		echo '</select>';
		echo '<p class="description">' . \esc_html__( 'WordPress author assigned to posts published by goals.ac.', 'goals-ac' ) . '</p>';
	}

	/**
	 * Render the read-only site key field.
	 */
	public function render_site_key_field(): void {
		$key = \goals_ac_site_key();
		echo '<code>' . \esc_html( $key ) . '</code>';
		echo '<p class="description">' . \esc_html__( 'This key is used to authenticate requests from goals.ac. Keep it secret.', 'goals-ac' ) . '</p>';
	}
}
