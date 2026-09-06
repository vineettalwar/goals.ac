<?php
/**
 * PHPUnit bootstrap.
 *
 * These tests cover string/export logic that does not need the WordPress
 * object model. Only escaping helpers and injectable test seams live here.
 * Do not reimplement WordPress sanitizers, post APIs, term APIs, or URL
 * helpers — anything that needs those belongs in wp-env
 * (`pnpm --filter @workspace/goals-ac-wp test:php`).
 *
 * @package goals-ac
 */

defined( 'ABSPATH' ) || define( 'ABSPATH', __DIR__ . '/' );

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Escaping shim for HTML attributes in string-level unit tests.
	 *
	 * @param string $url URL to escape.
	 * @return string
	 */
	function esc_url( $url ) {
		return htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	/**
	 * Passthrough shim for URL fields in string-level unit tests.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	function esc_url_raw( $url ) {
		return $url;
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Tag-strip shim for string-level unit tests.
	 *
	 * @param string $text Text to strip.
	 * @return string
	 */
	function wp_strip_all_tags( $text ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- test shim, not a WP reimplementation.
		return strip_tags( $text );
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	/**
	 * Injectable test seam — not a WordPress get_posts reimplementation.
	 * SiteGraphTest supplies the callable via $__goals_ac_test_get_posts_fn.
	 *
	 * @param array<string, mixed> $args WP_Query args.
	 * @return array<int, object>
	 */
	function get_posts( $args = array() ) {
		global $__goals_ac_test_get_posts_fn;
		return $__goals_ac_test_get_posts_fn ? ( $__goals_ac_test_get_posts_fn )( $args ) : array();
	}
}

if ( ! function_exists( 'is_plugin_active' ) ) {
	/**
	 * Injectable test seam — controlled via $__goals_ac_active_plugins.
	 *
	 * @param string $plugin Plugin basename.
	 * @return bool
	 */
	function is_plugin_active( $plugin ) {
		global $__goals_ac_active_plugins;
		return ! empty( $__goals_ac_active_plugins[ $plugin ] );
	}
}

require_once __DIR__ . '/../includes/class-internal-links.php';
require_once __DIR__ . '/../includes/class-site-graph.php';
require_once __DIR__ . '/../includes/class-health.php';
