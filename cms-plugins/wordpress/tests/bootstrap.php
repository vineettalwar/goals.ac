<?php
/**
 * PHPUnit bootstrap.
 *
 * These tests cover logic that does not touch the database or the WordPress
 * object model, so they run against plain PHP with the handful of WordPress
 * escaping helpers stubbed. Anything needing real posts belongs in a wp-env
 * integration test instead (`pnpm --filter @workspace/goals-ac-wp test:php`).
 *
 * @package goals-ac
 */

defined( 'ABSPATH' ) || define( 'ABSPATH', __DIR__ . '/' );

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Stub of WordPress esc_url.
	 *
	 * @param string $url URL to escape.
	 */
	function esc_url( $url ) {
		return htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	/**
	 * Stub of WordPress esc_url_raw.
	 *
	 * @param string $url URL to sanitize.
	 */
	function esc_url_raw( $url ) {
		return $url;
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Stub of WordPress wp_strip_all_tags.
	 *
	 * @param string $text Text to strip.
	 */
	function wp_strip_all_tags( $text ) {
		return strip_tags( $text );
	}
}

require_once __DIR__ . '/../includes/class-internal-links.php';
