<?php
/**
 * Maps canonical SEO fields to active WordPress SEO plugin meta keys.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Translates goals.ac SEO payloads into plugin-specific post meta keys.
 */
class Seo_Meta_Mapper {

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
	 * Map canonical SEO fields to active plugin meta keys.
	 *
	 * @param array<string, mixed> $seo Canonical seo payload from goals.ac.
	 * @return array<string, string>
	 */
	public static function map( array $seo ): array {
		$plugin = self::detect_plugin();
		$meta   = array();

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

			case 'aioseo':
				if ( $title ) {
					$meta['_aioseo_title'] = $title;
				}
				if ( $description ) {
					$meta['_aioseo_description'] = $description;
				}
				if ( $og_title ) {
					$meta['_aioseo_og_title'] = $og_title;
				}
				if ( $og_desc ) {
					$meta['_aioseo_og_description'] = $og_desc;
				}
				break;

			case 'seopress':
				if ( $title ) {
					$meta['_seopress_titles_title'] = $title;
				}
				if ( $description ) {
					$meta['_seopress_titles_desc'] = $description;
				}
				if ( $og_title ) {
					$meta['_seopress_social_fb_title'] = $og_title;
				}
				if ( $og_desc ) {
					$meta['_seopress_social_fb_desc'] = $og_desc;
				}
				break;

			default:
				if ( $description ) {
					$meta['_yoast_wpseo_metadesc'] = $description;
				}
				break;
		}

		return $meta;
	}
}
