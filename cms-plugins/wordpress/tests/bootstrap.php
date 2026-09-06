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

/**
 * Minimal in-memory WordPress stubs for Publish_Handler and Media_Handler.
 *
 * These are not a WordPress emulator — they exist only to let the tests
 * below observe two things real WordPress would otherwise hide: whether a
 * value passed to wp_insert_post()/wp_update_post() survives its
 * wp_unslash() round-trip, and what wp_insert_term()/wp_max_upload_size()
 * were called with. A real WordPress install belongs in the wp-env
 * integration test (`pnpm --filter @workspace/goals-ac-wp test:php`).
 */
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public $code;
		public $message;
		public $data;

		public function __construct( $code = '', $message = '', $data = '' ) {
			$this->code    = $code;
			$this->message = $message;
			$this->data    = $data;
		}

		public function get_error_message() {
			return $this->message;
		}
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}

if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = 'default' ) {
		return $text;
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $value ) {
		return trim( wp_strip_all_tags( (string) $value ) );
	}
}

if ( ! function_exists( 'wp_kses_post' ) ) {
	function wp_kses_post( $value ) {
		// Real wp_kses_post strips disallowed tags/attributes; it does not
		// touch plain text content, so a passthrough is faithful here.
		return (string) $value;
	}
}

if ( ! function_exists( 'sanitize_title' ) ) {
	function sanitize_title( $value ) {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9]+/', '-', $value );
		return trim( $value, '-' );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $value ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) );
	}
}

if ( ! function_exists( 'sanitize_file_name' ) ) {
	function sanitize_file_name( $value ) {
		return (string) $value;
	}
}

if ( ! function_exists( 'sanitize_mime_type' ) ) {
	function sanitize_mime_type( $value ) {
		return (string) $value;
	}
}

if ( ! function_exists( 'wp_slash' ) ) {
	function wp_slash( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'wp_slash', $value );
		}
		return is_string( $value ) ? addslashes( $value ) : $value;
	}
}

if ( ! function_exists( 'wp_unslash' ) ) {
	function wp_unslash( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'wp_unslash', $value );
		}
		return is_string( $value ) ? stripslashes( $value ) : $value;
	}
}

if ( ! function_exists( 'get_permalink' ) ) {
	function get_permalink( $post_id ) {
		return 'https://example.test/?p=' . (int) $post_id;
	}
}

if ( ! function_exists( 'get_post_type' ) ) {
	function get_post_type( $post_id ) {
		global $__goals_ac_test_post_types;
		return $__goals_ac_test_post_types[ $post_id ] ?? 'post';
	}
}

if ( ! function_exists( 'wp_insert_post' ) ) {
	function wp_insert_post( $postarr, $wp_error = false ) {
		global $__goals_ac_test_last_post;
		static $next_id = 1000;
		// Mirrors sanitize_post(): WordPress unslashes text fields on the way
		// in, on the assumption they arrived slashed (as $_POST would be).
		$__goals_ac_test_last_post = array(
			'raw'          => $postarr,
			'post_title'   => wp_unslash( $postarr['post_title'] ?? '' ),
			'post_content' => wp_unslash( $postarr['post_content'] ?? '' ),
		);
		return ++$next_id;
	}
}

if ( ! function_exists( 'wp_update_post' ) ) {
	function wp_update_post( $postarr, $wp_error = false ) {
		global $__goals_ac_test_last_post;
		$__goals_ac_test_last_post = array(
			'raw'          => $postarr,
			'post_title'   => wp_unslash( $postarr['post_title'] ?? '' ),
			'post_content' => wp_unslash( $postarr['post_content'] ?? '' ),
		);
		return $postarr['ID'] ?? 0;
	}
}

if ( ! function_exists( 'wp_set_post_categories' ) ) {
	function wp_set_post_categories( $post_id, $ids ) {
		return true;
	}
}

if ( ! function_exists( 'wp_set_post_tags' ) ) {
	function wp_set_post_tags( $post_id, $tags ) {
		return true;
	}
}

if ( ! function_exists( 'set_post_thumbnail' ) ) {
	function set_post_thumbnail( $post_id, $attachment_id ) {
		return true;
	}
}

if ( ! function_exists( 'update_post_meta' ) ) {
	function update_post_meta( $post_id, $key, $value ) {
		return true;
	}
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( $name, $default = false ) {
		global $__goals_ac_test_options;
		return $__goals_ac_test_options[ $name ] ?? $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	function update_option( $name, $value, $autoload = null ) {
		global $__goals_ac_test_options;
		$__goals_ac_test_options[ $name ] = $value;
		return true;
	}
}

if ( ! function_exists( 'delete_option' ) ) {
	function delete_option( $name ) {
		global $__goals_ac_test_options;
		unset( $__goals_ac_test_options[ $name ] );
		return true;
	}
}

if ( ! function_exists( 'get_current_user_id' ) ) {
	function get_current_user_id() {
		global $__goals_ac_test_current_user_id;
		return $__goals_ac_test_current_user_id ?? 0;
	}
}

if ( ! function_exists( 'get_userdata' ) ) {
	function get_userdata( $id ) {
		global $__goals_ac_test_users;
		return $__goals_ac_test_users[ $id ] ?? false;
	}
}

if ( ! function_exists( 'get_users' ) ) {
	function get_users( $args = array() ) {
		global $__goals_ac_test_users;
		$users = array_values( $__goals_ac_test_users ?? array() );
		usort( $users, fn( $a, $b ) => $a->ID <=> $b->ID );
		if ( ! empty( $args['number'] ) ) {
			$users = array_slice( $users, 0, (int) $args['number'] );
		}
		return $users;
	}
}

if ( ! function_exists( 'get_term_by' ) ) {
	function get_term_by( $field, $value, $taxonomy ) {
		global $__goals_ac_test_terms;
		foreach ( (array) $__goals_ac_test_terms as $term ) {
			if ( $term->taxonomy !== $taxonomy ) {
				continue;
			}
			if ( 'name' === $field && $term->name === $value ) {
				return $term;
			}
			if ( 'slug' === $field && $term->slug === $value ) {
				return $term;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'get_term' ) ) {
	function get_term( $id, $taxonomy ) {
		global $__goals_ac_test_terms;
		foreach ( (array) $__goals_ac_test_terms as $term ) {
			if ( (int) $term->term_id === (int) $id && $term->taxonomy === $taxonomy ) {
				return $term;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'wp_insert_term' ) ) {
	function wp_insert_term( $name, $taxonomy, $args = array() ) {
		global $__goals_ac_test_terms;
		static $next_id = 5000;
		$term            = (object) array(
			'term_id'  => ++$next_id,
			'name'     => $name,
			'slug'     => sanitize_title( $name ),
			'taxonomy' => $taxonomy,
		);
		$__goals_ac_test_terms[] = $term;
		return array(
			'term_id'          => $term->term_id,
			'term_taxonomy_id' => $term->term_id,
		);
	}
}

if ( ! function_exists( 'wp_max_upload_size' ) ) {
	function wp_max_upload_size() {
		global $__goals_ac_test_max_upload_size;
		return $__goals_ac_test_max_upload_size ?? ( 2 * 1024 * 1024 );
	}
}

if ( ! function_exists( 'wp_upload_dir' ) ) {
	function wp_upload_dir() {
		return array(
			'path'  => sys_get_temp_dir(),
			'error' => false,
		);
	}
}

if ( ! function_exists( 'wp_unique_filename' ) ) {
	function wp_unique_filename( $dir, $filename ) {
		return uniqid( 'goals-ac-test-', true ) . '-' . $filename;
	}
}

if ( ! function_exists( 'media_handle_sideload' ) ) {
	function media_handle_sideload( $file_array, $post_id ) {
		global $__goals_ac_test_last_sideload;
		$__goals_ac_test_last_sideload = $file_array;
		return 42;
	}
}

require_once __DIR__ . '/../../shared/src/KeyStore.php';
require_once __DIR__ . '/../../shared/src/NonceStore.php';
require_once __DIR__ . '/../../shared/src/Idempotency.php';
require_once __DIR__ . '/../includes/class-internal-links.php';
require_once __DIR__ . '/../includes/class-publish-handler.php';
require_once __DIR__ . '/../includes/class-media-handler.php';
