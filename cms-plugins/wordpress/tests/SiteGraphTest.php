<?php
/**
 * Tests for Site_Graph post-cap and link-scan window (no WordPress runtime).
 *
 * Exercises query_published_posts() via the get_posts test seam. Mapping that
 * calls wp_get_post_categories / wp_parse_url / etc. belongs in wp-env.
 *
 * @package goals-ac
 */

use PHPUnit\Framework\TestCase;
use Goals_AC\Site_Graph;

/**
 * Covers the post-cap and internal-link-scan-limit logic in Site_Graph.
 */
final class SiteGraphTest extends TestCase {

	/** Reset the get_posts seam after each test. */
	protected function tearDown(): void {
		global $__goals_ac_test_get_posts_fn;
		$__goals_ac_test_get_posts_fn = null;
	}

	/**
	 * Build a minimal post-like object.
	 *
	 * @param int    $id      Post ID.
	 * @param string $content post_content value.
	 * @return \stdClass
	 */
	private function make_post( int $id, string $content = '' ): \stdClass {
		$post                = new \stdClass();
		$post->ID            = $id;
		$post->post_title    = 'Post ' . $id;
		$post->post_name     = 'post-' . $id;
		$post->post_content  = $content;
		$post->post_date     = '2024-01-01 00:00:00';
		$post->post_modified = '2024-01-01 00:00:00';
		return $post;
	}

	/**
	 * Install a seam that serves N posts in batches of $per_page.
	 *
	 * @param int $total    Total posts to simulate.
	 * @param int $per_page Batch size (defaults to 100, matching the class).
	 */
	private function stub_posts( int $total, int $per_page = 100 ): void {
		global $__goals_ac_test_get_posts_fn;

		$all_posts = array();
		for ( $i = 1; $i <= $total; ++$i ) {
			$all_posts[] = $this->make_post( $i );
		}

		$__goals_ac_test_get_posts_fn = function ( $args ) use ( $all_posts, $per_page ) {
			$page   = (int) ( $args['paged'] ?? 1 );
			$offset = ( $page - 1 ) * $per_page;
			return array_slice( $all_posts, $offset, $per_page );
		};
	}

	/**
	 * Invoke private query_published_posts().
	 *
	 * @return array<int, object>
	 */
	private function query_posts(): array {
		$graph     = new Site_Graph();
		$reflected = new ReflectionMethod( $graph, 'query_published_posts' );
		$reflected->setAccessible( true );
		return $reflected->invoke( $graph );
	}

	/**
	 * Under the post cap, every published post is returned.
	 */
	public function test_under_cap_returns_all_posts(): void {
		$this->stub_posts( 50 );

		$posts = $this->query_posts();

		$this->assertCount( 50, $posts );
		$this->assertLessThan( Site_Graph::SITE_GRAPH_POST_LIMIT, count( $posts ) );
	}

	/**
	 * Exactly at the post cap still returns the full capped set.
	 */
	public function test_exactly_at_cap_hits_limit(): void {
		$this->stub_posts( Site_Graph::SITE_GRAPH_POST_LIMIT );

		$posts = $this->query_posts();

		$this->assertCount( Site_Graph::SITE_GRAPH_POST_LIMIT, $posts );
		$this->assertGreaterThanOrEqual( Site_Graph::SITE_GRAPH_POST_LIMIT, count( $posts ) );
	}

	/**
	 * Over the post cap, results are trimmed to SITE_GRAPH_POST_LIMIT.
	 */
	public function test_over_cap_trims_to_limit(): void {
		$this->stub_posts( Site_Graph::SITE_GRAPH_POST_LIMIT + 300 );

		$posts = $this->query_posts();

		$this->assertCount( Site_Graph::SITE_GRAPH_POST_LIMIT, $posts );
	}

	/**
	 * Link-scan window covers the most recent posts only.
	 */
	public function test_link_scan_window_is_most_recent_subset(): void {
		$this->stub_posts( Site_Graph::SITE_GRAPH_POST_LIMIT );

		$posts = $this->query_posts();
		$slice = array_slice( $posts, -Site_Graph::SITE_GRAPH_LINK_SCAN_LIMIT );
		$ids   = array_map(
			static function ( $post ) {
				return (int) $post->ID;
			},
			$slice
		);

		$this->assertContains( 499, $ids, 'Recent post must fall inside the link-scan window' );
		$this->assertNotContains( 1, $ids, 'Early post must fall outside the link-scan window' );
	}
}
