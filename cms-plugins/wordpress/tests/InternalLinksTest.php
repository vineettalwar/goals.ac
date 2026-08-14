<?php
/**
 * Tests for internal link insertion.
 *
 * The risk this guards against is corrupting an already-published post:
 * nesting an anchor, writing into an HTML attribute, or breaking a Gutenberg
 * block delimiter. Each of those is covered below.
 *
 * @package goals-ac
 */

use PHPUnit\Framework\TestCase;
use Goals_AC\Internal_Links;

/**
 * Covers Internal_Links string handling.
 */
final class InternalLinksTest extends TestCase {

	private const URL = 'https://example.com/new-post';

	/**
	 * Invoke a private method on Internal_Links.
	 *
	 * @param string            $method Method name.
	 * @param array<int, mixed> $args   Arguments.
	 * @return mixed
	 */
	private function call( string $method, array $args ) {
		$links     = new Internal_Links();
		$reflected = new ReflectionMethod( $links, $method );
		$reflected->setAccessible( true );
		return $reflected->invokeArgs( $links, $args );
	}

	/**
	 * Wrap the first plain-text mention.
	 *
	 * @param string $content Post content.
	 * @param string $anchor  Anchor phrase.
	 * @return string|null
	 */
	private function link( string $content, string $anchor ): ?string {
		return $this->call( 'link_first_mention', array( $content, $anchor, self::URL ) );
	}

	public function test_links_a_plain_mention(): void {
		$this->assertSame(
			'<p>We offer <a href="https://example.com/new-post">wordpress maintenance</a> for teams.</p>',
			$this->link( '<p>We offer wordpress maintenance for teams.</p>', 'wordpress maintenance' )
		);
	}

	public function test_never_nests_inside_an_existing_anchor(): void {
		$this->assertNull(
			$this->link( '<p><a href="/old">wordpress maintenance</a> is here.</p>', 'wordpress maintenance' )
		);
	}

	public function test_prefers_the_plain_occurrence_over_the_anchored_one(): void {
		$this->assertSame(
			'<p><a href="/old">wordpress maintenance</a> and more <a href="https://example.com/new-post">wordpress maintenance</a>.</p>',
			$this->link(
				'<p><a href="/old">wordpress maintenance</a> and more wordpress maintenance.</p>',
				'wordpress maintenance'
			)
		);
	}

	public function test_never_writes_into_an_html_attribute(): void {
		$this->assertNull(
			$this->link( '<img alt="wordpress maintenance" src="/a.png">', 'wordpress maintenance' )
		);
	}

	public function test_preserves_gutenberg_block_delimiters(): void {
		$this->assertSame(
			'<!-- wp:paragraph --><p>Our <a href="https://example.com/new-post">wordpress maintenance</a> plan.</p><!-- /wp:paragraph -->',
			$this->link(
				'<!-- wp:paragraph --><p>Our wordpress maintenance plan.</p><!-- /wp:paragraph -->',
				'wordpress maintenance'
			)
		);
	}

	public function test_matches_case_insensitively_and_keeps_original_casing(): void {
		$this->assertSame(
			'<p><a href="https://example.com/new-post">WordPress Maintenance</a> is our thing.</p>',
			$this->link( '<p>WordPress Maintenance is our thing.</p>', 'wordpress maintenance' )
		);
	}

	public function test_links_only_the_first_occurrence(): void {
		$this->assertSame(
			'<p><a href="https://example.com/new-post">seo</a> here and seo there.</p>',
			$this->link( '<p>seo here and seo there.</p>', 'seo' )
		);
	}

	public function test_returns_null_when_the_anchor_is_absent(): void {
		$this->assertNull( $this->link( '<p>Nothing relevant here.</p>', 'wordpress maintenance' ) );
	}

	public function test_treats_regex_metacharacters_literally(): void {
		$this->assertSame(
			'<p>Read the <a href="https://example.com/new-post">C++ (advanced)</a> guide today.</p>',
			$this->link( '<p>Read the C++ (advanced) guide today.</p>', 'C++ (advanced)' )
		);
	}

	public function test_matches_a_phrase_broken_by_a_newline(): void {
		$this->assertSame(
			"<p>Our <a href=\"https://example.com/new-post\">wordpress\nmaintenance</a> plan.</p>",
			$this->link( "<p>Our wordpress\nmaintenance plan.</p>", 'wordpress maintenance' )
		);
	}

	public function test_matches_a_phrase_with_extra_spacing(): void {
		$this->assertSame(
			'<p>Our <a href="https://example.com/new-post">wordpress   maintenance</a> plan.</p>',
			$this->link( '<p>Our wordpress   maintenance plan.</p>', 'wordpress maintenance' )
		);
	}

	public function test_handles_content_with_no_markup(): void {
		$this->assertSame(
			'plain <a href="https://example.com/new-post">wordpress maintenance</a> text',
			$this->link( 'plain wordpress maintenance text', 'wordpress maintenance' )
		);
	}

	public function test_detects_an_existing_link_in_either_quote_style(): void {
		$this->assertTrue(
			$this->call( 'already_links_to', array( '<a href="' . self::URL . '">x</a>', self::URL ) )
		);
		$this->assertTrue(
			$this->call( 'already_links_to', array( "<a href='" . self::URL . "'>x</a>", self::URL ) )
		);
	}

	public function test_reports_no_existing_link_for_a_different_url(): void {
		$this->assertFalse(
			$this->call( 'already_links_to', array( '<a href="https://example.com/other">x</a>', self::URL ) )
		);
	}

	public function test_insert_returns_empty_result_for_blank_input(): void {
		$links = new Internal_Links();

		$this->assertSame(
			array( 'updated' => array(), 'skipped' => array() ),
			$links->insert( '', 'anchor', array( 1 ) )
		);
		$this->assertSame(
			array( 'updated' => array(), 'skipped' => array() ),
			$links->insert( self::URL, '   ', array( 1 ) )
		);
	}
}
