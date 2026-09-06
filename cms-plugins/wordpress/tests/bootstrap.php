<?php
/**
 * PHPUnit bootstrap.
 *
 * These tests cover string/export logic that does not need the WordPress
 * object model, so they run against plain PHP with a few call-site stubs.
 * Do not reimplement WordPress sanitizers, post APIs, or term APIs here —
 * anything that needs those belongs in wp-env (`pnpm --filter @workspace/goals-ac-wp test:php`).
 *
 * @package goals-ac
 */

defined( 'ABSPATH' ) || define( 'ABSPATH', __DIR__ . '/' );

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Test stand-in for WordPress esc_url (HTML-attribute escaping only).
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
	 * Test stand-in for WordPress esc_url_raw (passthrough for unit tests).
	 *
	 * @param string $url URL to sanitize.
	 * @return string
	 */
	function esc_url_raw( $url ) {
		return $url;
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Test stand-in for WordPress wp_strip_all_tags.
	 *
	 * @param string $text Text to strip.
	 * @return string
	 */
	function wp_strip_all_tags( $text ) {
		return strip_tags( $text );
	}
}

if ( ! class_exists( 'WP_Error' ) ) {
	/**
	 * Minimal WP_Error stand-in for is_wp_error() checks in Site_Graph.
	 */
	class WP_Error {
		/**
		 * Error message.
		 *
		 * @var string
		 */
		public $message;

		/**
		 * @param string $code    Unused error code.
		 * @param string $message Error message.
		 * @param mixed  $data    Unused error data.
		 */
		public function __construct( $code = '', $message = '', $data = '' ) {
			$this->message = $message;
		}
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	/**
	 * Test stand-in for WordPress is_wp_error.
	 *
	 * @param mixed $thing Value to check.
	 * @return bool
	 */
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}

if ( ! function_exists( 'get_permalink' ) ) {
	/**
	 * Test stand-in for WordPress get_permalink.
	 *
	 * @param int $post_id Post ID.
	 * @return string
	 */
	function get_permalink( $post_id ) {
		return 'https://example.test/?p=' . (int) $post_id;
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	/**
	 * Stub: delegates to a test-supplied callable stored in a global.
	 *
	 * @param array<string, mixed> $args WP_Query args.
	 * @return array<int, object>
	 */
	function get_posts( $args = array() ) {
		global $__goals_ac_test_get_posts_fn;
		return $__goals_ac_test_get_posts_fn ? ( $__goals_ac_test_get_posts_fn )( $args ) : array();
	}
}

if ( ! function_exists( 'get_site_url' ) ) {
	/**
	 * Test stand-in for WordPress get_site_url.
	 *
	 * @return string
	 */
	function get_site_url() {
		return 'https://example.test';
	}
}

if ( ! function_exists( 'untrailingslashit' ) ) {
	/**
	 * Test stand-in for WordPress untrailingslashit.
	 *
	 * @param string $str Path or URL.
	 * @return string
	 */
	function untrailingslashit( $str ) {
		return rtrim( $str, '/\\' );
	}
}

if ( ! function_exists( 'wp_parse_url' ) ) {
	/**
	 * Test stand-in for WordPress wp_parse_url — delegates to PHP parse_url.
	 *
	 * @param string $url       URL.
	 * @param int    $component parse_url component constant.
	 * @return mixed
	 */
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component );
	}
}

if ( ! function_exists( 'wp_get_post_categories' ) ) {
	/**
	 * Test stand-in for WordPress wp_get_post_categories.
	 *
	 * @param int                  $post_id Post ID.
	 * @param array<string, mixed> $args    Query args.
	 * @return array<int, int>
	 */
	function wp_get_post_categories( $post_id, $args = array() ) {
		return array();
	}
}

if ( ! function_exists( 'wp_get_post_tags' ) ) {
	/**
	 * Test stand-in for WordPress wp_get_post_tags.
	 *
	 * @param int                  $post_id Post ID.
	 * @param array<string, mixed> $args    Query args.
	 * @return array<int, int>
	 */
	function wp_get_post_tags( $post_id, $args = array() ) {
		return array();
	}
}

if ( ! function_exists( 'wp_trim_words' ) ) {
	/**
	 * Test stand-in for WordPress wp_trim_words.
	 *
	 * @param string $text      Source text.
	 * @param int    $num_words Word limit.
	 * @param string $more      Ellipsis suffix.
	 * @return string
	 */
	function wp_trim_words( $text, $num_words = 55, $more = '...' ) {
		$words = preg_split( '/[\n\r\t ]+/', (string) $text, $num_words + 1, PREG_SPLIT_NO_EMPTY );
		if ( count( $words ) > $num_words ) {
			array_pop( $words );
			return implode( ' ', $words ) . $more;
		}
		return implode( ' ', $words );
	}
}

if ( ! function_exists( 'get_terms' ) ) {
	/**
	 * Test stand-in for WordPress get_terms.
	 *
	 * @param array<string, mixed> $args Query args.
	 * @return array
	 */
	function get_terms( $args = array() ) {
		return array();
	}
}

require_once __DIR__ . '/../includes/class-internal-links.php';
require_once __DIR__ . '/../includes/class-site-graph.php';
