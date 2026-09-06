<?php
/**
 * Maps canonical SEO fields to the active WordPress SEO plugin's storage.
 *
 * Yoast / Rank Math / SEOPress: post meta keys.
 * AIOSEO v4+: `wp_aioseo_posts` via Models\Post::savePost (post meta alone is ignored).
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Translates goals.ac SEO payloads into the installed SEO plugin's real storage.
 */
class Seo_Meta_Mapper {

	/**
	 * Every meta key this mapper may write (for strip + REST registration).
	 *
	 * @var array<int, string>
	 */
	public const ALL_META_KEYS = array(
		'_yoast_wpseo_title',
		'_yoast_wpseo_metadesc',
		'_yoast_wpseo_focuskw',
		'_yoast_wpseo_opengraph-title',
		'_yoast_wpseo_opengraph-description',
		'_yoast_wpseo_opengraph-image',
		'rank_math_title',
		'rank_math_description',
		'rank_math_focus_keyword',
		'rank_math_facebook_title',
		'rank_math_facebook_description',
		'rank_math_facebook_image',
		'_aioseo_title',
		'_aioseo_description',
		'_aioseo_og_title',
		'_aioseo_og_description',
		'_seopress_titles_title',
		'_seopress_titles_desc',
		'_seopress_social_fb_title',
		'_seopress_social_fb_desc',
		'_seopress_analysis_target_kw',
	);

	/**
	 * Detect the active SEO plugin slug.
	 */
	public static function detect_plugin(): ?string {
		if ( ! \function_exists( 'is_plugin_active' ) ) {
			include_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$candidates = array(
			'wordpress-seo/wp-seo.php'                    => 'yoast',
			'seo-by-rank-math/rank-math.php'              => 'rankmath',
			'all-in-one-seo-pack/all_in_one_seo_pack.php' => 'aioseo',
			'all-in-one-seo-pack-pro/all_in_one_seo_pack.php' => 'aioseo',
			'wp-seopress/seopress.php'                    => 'seopress',
			'wp-seopress-pro/seopress.php'                => 'seopress',
		);

		foreach ( $candidates as $file => $slug ) {
			if ( \is_plugin_active( $file ) ) {
				return $slug;
			}
		}

		return null;
	}

	/**
	 * Remove known SEO-plugin keys from a client-supplied meta bag.
	 *
	 * Server-side apply() owns those fields so App-Password / plugin clients
	 * cannot spam every plugin's keys onto the post.
	 *
	 * @param array<string, mixed> $meta Client meta bag.
	 * @return array<string, mixed>
	 */
	public static function strip_seo_keys( array $meta ): array {
		foreach ( self::ALL_META_KEYS as $key ) {
			unset( $meta[ $key ] );
		}
		return $meta;
	}

	/**
	 * Write canonical SEO fields into the active plugin's real storage.
	 *
	 * @param int                  $post_id Post ID.
	 * @param array<string, mixed> $seo     Canonical seo payload from goals.ac.
	 */
	public static function apply( int $post_id, array $seo ): void {
		$plugin = self::detect_plugin();
		if ( null === $plugin ) {
			return;
		}

		if ( 'aioseo' === $plugin ) {
			self::apply_aioseo( $post_id, $seo );
			return;
		}

		foreach ( self::map_for_plugin( $plugin, $seo ) as $key => $value ) {
			// Keys may contain hyphens (Yoast OG). Do not run sanitize_key —
			// it is for option/query keys and would be fine here, but keep the
			// exact plugin key string.
			\update_post_meta( $post_id, $key, $value );
		}
	}

	/**
	 * Map canonical SEO fields to active plugin meta keys (post-meta plugins only).
	 *
	 * Prefer apply() for writes — especially AIOSEO, which ignores these keys.
	 *
	 * @param array<string, mixed> $seo Canonical seo payload from goals.ac.
	 * @return array<string, string>
	 */
	public static function map( array $seo ): array {
		$plugin = self::detect_plugin();
		if ( null === $plugin || 'aioseo' === $plugin ) {
			// AIOSEO reads wp_aioseo_posts, not post meta. map() stays empty so
			// callers that only update_post_meta do not create dead keys.
			return array();
		}
		return self::map_for_plugin( $plugin, $seo );
	}

	/**
	 * Map canonical SEO fields to a specific plugin's post meta keys.
	 *
	 * @param string               $plugin Plugin slug from detect_plugin().
	 * @param array<string, mixed> $seo    Canonical seo payload.
	 * @return array<string, string>
	 */
	public static function map_for_plugin( string $plugin, array $seo ): array {
		$meta = array();

		$title       = \sanitize_text_field( $seo['seoTitle'] ?? $seo['seo_title'] ?? '' );
		$description = \sanitize_text_field( $seo['metaDescription'] ?? $seo['meta_description'] ?? '' );
		$keyword     = \sanitize_text_field( $seo['focusKeyword'] ?? $seo['focus_keyword'] ?? '' );
		$og_title    = \sanitize_text_field( $seo['ogTitle'] ?? $seo['og_title'] ?? $title );
		$og_desc     = \sanitize_text_field( $seo['ogDescription'] ?? $seo['og_description'] ?? $description );
		$og_image    = \esc_url_raw( $seo['ogImageUrl'] ?? $seo['og_image_url'] ?? '' );

		switch ( $plugin ) {
			case 'yoast':
				if ( $title ) {
					$meta['_yoast_wpseo_title'] = $title;
				}
				if ( $description ) {
					$meta['_yoast_wpseo_metadesc'] = $description;
				}
				if ( $keyword ) {
					$meta['_yoast_wpseo_focuskw'] = $keyword;
				}
				if ( $og_title ) {
					$meta['_yoast_wpseo_opengraph-title'] = $og_title;
				}
				if ( $og_desc ) {
					$meta['_yoast_wpseo_opengraph-description'] = $og_desc;
				}
				if ( $og_image ) {
					$meta['_yoast_wpseo_opengraph-image'] = $og_image;
				}
				break;

			case 'rankmath':
				if ( $title ) {
					$meta['rank_math_title'] = $title;
				}
				if ( $description ) {
					$meta['rank_math_description'] = $description;
				}
				if ( $keyword ) {
					$meta['rank_math_focus_keyword'] = $keyword;
				}
				if ( $og_title ) {
					$meta['rank_math_facebook_title'] = $og_title;
				}
				if ( $og_desc ) {
					$meta['rank_math_facebook_description'] = $og_desc;
				}
				if ( $og_image ) {
					$meta['rank_math_facebook_image'] = $og_image;
				}
				break;

			case 'seopress':
				if ( $title ) {
					$meta['_seopress_titles_title'] = $title;
				}
				if ( $description ) {
					$meta['_seopress_titles_desc'] = $description;
				}
				if ( $keyword ) {
					$meta['_seopress_analysis_target_kw'] = $keyword;
				}
				if ( $og_title ) {
					$meta['_seopress_social_fb_title'] = $og_title;
				}
				if ( $og_desc ) {
					$meta['_seopress_social_fb_desc'] = $og_desc;
				}
				break;
		}

		return $meta;
	}

	/**
	 * Persist SEO fields into AIOSEO's custom table (and WPML post-meta copies).
	 *
	 * @param int                  $post_id Post ID.
	 * @param array<string, mixed> $seo     Canonical seo payload.
	 */
	private static function apply_aioseo( int $post_id, array $seo ): void {
		if ( ! \class_exists( '\AIOSEO\Plugin\Common\Models\Post' ) ) {
			return;
		}

		$title       = \sanitize_text_field( $seo['seoTitle'] ?? $seo['seo_title'] ?? '' );
		$description = \sanitize_text_field( $seo['metaDescription'] ?? $seo['meta_description'] ?? '' );
		$keyword     = \sanitize_text_field( $seo['focusKeyword'] ?? $seo['focus_keyword'] ?? '' );
		$og_title    = \sanitize_text_field( $seo['ogTitle'] ?? $seo['og_title'] ?? $title );
		$og_desc     = \sanitize_text_field( $seo['ogDescription'] ?? $seo['og_description'] ?? $description );
		$og_image    = \esc_url_raw( $seo['ogImageUrl'] ?? $seo['og_image_url'] ?? '' );

		$data = array();
		if ( $title ) {
			$data['title'] = $title;
		}
		if ( $description ) {
			$data['description'] = $description;
		}
		if ( $og_title ) {
			$data['og_title'] = $og_title;
		}
		if ( $og_desc ) {
			$data['og_description'] = $og_desc;
		}
		if ( $og_image ) {
			$data['og_image_type']       = 'custom';
			$data['og_image_custom_url'] = $og_image;
		}
		if ( $keyword ) {
			$data['keyphrases'] = array(
				'focus'      => array(
					'keyphrase' => $keyword,
					'score'     => 0,
					'analysis'  => array(),
				),
				'additional' => array(),
			);
		}

		if ( empty( $data ) ) {
			return;
		}

		\AIOSEO\Plugin\Common\Models\Post::savePost( $post_id, $data );
	}
}
