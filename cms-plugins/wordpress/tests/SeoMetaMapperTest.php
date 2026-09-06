<?php
/**
 * Unit tests for Seo_Meta_Mapper (no full WordPress boot).
 *
 * map_for_plugin() calls sanitize_text_field — that path is covered under
 * wp-env (`test:php`), not by reimplementing WordPress sanitizers here.
 *
 * @package goals-ac
 */

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../includes/class-seo-meta-mapper.php';

/**
 * Covers SEO plugin detection and meta key stripping.
 *
 * @covers \Goals_AC\Seo_Meta_Mapper
 */
class SeoMetaMapperTest extends TestCase {

	/**
	 * Clear the active-plugin seam before each test.
	 */
	protected function setUp(): void {
		global $__goals_ac_active_plugins;
		$__goals_ac_active_plugins = array();
	}

	/**
	 * AIOSEO sites get an empty map (unsupported for meta write).
	 */
	public function test_map_returns_empty_for_aioseo(): void {
		global $__goals_ac_active_plugins;
		$__goals_ac_active_plugins['all-in-one-seo-pack/all_in_one_seo_pack.php'] = true;
		$this->assertSame( array(), \Goals_AC\Seo_Meta_Mapper::map( array( 'seoTitle' => 'T' ) ) );
	}

	/**
	 * Known SEO meta keys are stripped; custom fields remain.
	 */
	public function test_strip_seo_keys(): void {
		$stripped = \Goals_AC\Seo_Meta_Mapper::strip_seo_keys(
			array(
				'_yoast_wpseo_metadesc' => 'x',
				'custom_field'          => 'keep',
			)
		);
		$this->assertSame( array( 'custom_field' => 'keep' ), $stripped );
	}

	/**
	 * Yoast is detected when its plugin basename is active.
	 */
	public function test_detect_yoast(): void {
		global $__goals_ac_active_plugins;
		$__goals_ac_active_plugins['wordpress-seo/wp-seo.php'] = true;
		$this->assertSame( 'yoast', \Goals_AC\Seo_Meta_Mapper::detect_plugin() );
	}
}
