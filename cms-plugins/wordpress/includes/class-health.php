<?php
/**
 * Health / capability payload for GET /goals-ac/v1/health.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the plugin health response (capabilities, builders, SEO plugin).
 */
class Health {

	/**
	 * Assemble the health payload used by the REST health endpoint.
	 *
	 * @return array<string, mixed>
	 */
	public static function payload(): array {
		$capabilities = \GoalsAC\Shared\Contract::defaultCapabilities();
		if ( \class_exists( __NAMESPACE__ . '\Seo_Meta_Mapper' ) ) {
			$capabilities['seo_meta']   = true;
			$capabilities['seo_plugin'] = Seo_Meta_Mapper::detect_plugin();
		}

		$detected_builders = self::detect_builders();

		return \GoalsAC\Shared\Contract::healthResponse(
			\get_bloginfo( 'version' ),
			array(
				'version'                 => GOALS_AC_VERSION,
				'capabilities'            => $capabilities,
				'detected_builders'       => $detected_builders,
				'recommended_editor_mode' => self::recommended_editor_mode( $detected_builders ),
			)
		);
	}

	/**
	 * Detect which page builders appear to be installed.
	 *
	 * @return array<int, string>
	 */
	public static function detect_builders(): array {
		$builders = array( 'gutenberg' );
		if ( \defined( 'ELEMENTOR_VERSION' ) || \class_exists( '\Elementor\Plugin' ) ) {
			$builders[] = 'elementor';
		}
		if ( \defined( 'ET_BUILDER_VERSION' ) || \function_exists( 'et_setup_theme' ) ) {
			$builders[] = 'divi';
		}
		return $builders;
	}

	/**
	 * Pick the preferred editor mode from detected builders.
	 *
	 * @param array<int, string> $builders Detected builder slugs.
	 */
	public static function recommended_editor_mode( array $builders ): string {
		if ( \in_array( 'elementor', $builders, true ) ) {
			return 'elementor';
		}
		if ( \in_array( 'gutenberg', $builders, true ) ) {
			return 'gutenberg';
		}
		return 'classic';
	}
}
