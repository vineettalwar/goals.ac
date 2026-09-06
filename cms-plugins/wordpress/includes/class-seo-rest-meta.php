<?php
/**
 * Registers SEO meta keys for WordPress core REST so Application Password
 * publishes (POST/PUT /wp/v2/posts) persist meta without HMAC plugin routes.
 *
 * Without this, core REST silently drops unregistered meta keys —
 * see detectMetaWarning() in the TypeScript connector.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

class Seo_Rest_Meta {

	/**
	 * Every meta key the Seo_Meta_Mapper may produce, across all supported
	 * SEO plugins. Kept as a flat list — register_post_meta is a no-op for
	 * keys that were already registered by the SEO plugin itself.
	 */
	private const KEYS = array(
		// Yoast.
		'_yoast_wpseo_title',
		'_yoast_wpseo_metadesc',
		'_yoast_wpseo_focuskw',
		'_yoast_wpseo_opengraph-title',
		'_yoast_wpseo_opengraph-description',
		'_yoast_wpseo_opengraph-image',
		// Rank Math.
		'rank_math_title',
		'rank_math_description',
		'rank_math_focus_keyword',
		'rank_math_facebook_title',
		'rank_math_facebook_description',
		'rank_math_facebook_image',
		// AIOSEO.
		'_aioseo_title',
		'_aioseo_description',
		'_aioseo_og_title',
		'_aioseo_og_description',
		// SEOPress.
		'_seopress_titles_title',
		'_seopress_titles_desc',
		'_seopress_social_fb_title',
		'_seopress_social_fb_desc',
	);

	/**
	 * Hook into init to register meta before any REST request fires.
	 */
	public function init(): void {
		add_action( 'init', array( $this, 'register' ) );
	}

	/**
	 * Register every known SEO meta key for posts with show_in_rest = true.
	 */
	public function register(): void {
		foreach ( self::KEYS as $key ) {
			\register_post_meta(
				'post',
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
