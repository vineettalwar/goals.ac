<?php
/**
 * Health helper unit tests (no WordPress runtime).
 *
 * @package goals-ac
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../includes/class-health.php';

/**
 * Covers recommended editor mode selection from detected builders.
 *
 * @covers \Goals_AC\Health
 */
class HealthTest extends TestCase {

	/**
	 * Elementor is preferred when listed alongside Gutenberg.
	 */
	public function test_recommended_editor_mode_prefers_elementor(): void {
		$this->assertSame(
			'elementor',
			\Goals_AC\Health::recommended_editor_mode( array( 'gutenberg', 'elementor' ) )
		);
	}

	/**
	 * Gutenberg is used when Elementor is not detected.
	 */
	public function test_recommended_editor_mode_falls_back_to_gutenberg(): void {
		$this->assertSame(
			'gutenberg',
			\Goals_AC\Health::recommended_editor_mode( array( 'gutenberg' ) )
		);
	}

	/**
	 * Classic is used when no builders are detected.
	 */
	public function test_recommended_editor_mode_classic_when_empty(): void {
		$this->assertSame( 'classic', \Goals_AC\Health::recommended_editor_mode( array() ) );
	}
}
