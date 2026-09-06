<?php
/**
 * Registers SEO meta keys for WordPress core REST so Application Password
 * publishes (POST/PUT /wp/v2/posts) persist meta without HMAC plugin routes.
 *
 * Without this, core REST silently drops unregistered meta keys —
 * see detectMetaWarning() in the TypeScript connector.
 *
 * AIOSEO v4 stores SEO in `wp_aioseo_posts` and exposes `aioseo_meta_data` on
 * REST itself — these post-meta keys are only for Yoast / Rank Math / SEOPress
 * (and AIOSEO's WPML duplicate copies when AIOSEO also writes them).
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Registers SEO post meta keys with show_in_rest for core REST publishes.
 */
class Seo_Rest_Meta {

	/**
	 * Post types that receive SEO meta registration.
	 *
	 * @var array<int, string>
	 */
	private const POST_TYPES = array( 'post', 'page' );

	/**
	 * Hook into init to register meta before any REST request fires.
	 */
	public function init(): void {
		add_action( 'init', array( $this, 'register' ) );
	}

	/**
	 * Register every known SEO meta key with show_in_rest = true.
	 */
	public function register(): void {
		foreach ( self::POST_TYPES as $post_type ) {
			foreach ( Seo_Meta_Mapper::ALL_META_KEYS as $key ) {
				\register_post_meta(
					$post_type,
					$key,
					array(
						'show_in_rest'  => true,
						'single'        => true,
						'type'          => 'string',
						'auth_callback' => function ( $allowed, $meta_key, $object_id ) {
							return \current_user_can( 'edit_post', $object_id );
						},
					)
				);
			}
		}
	}
}
