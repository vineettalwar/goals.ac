<?php
/**
 * Tests for Site_Graph post-cap and truncation behaviour.
 *
 * @package goals-ac
 */

use PHPUnit\Framework\TestCase;
use Goals_AC\Site_Graph;

/**
 * Covers the post-cap and internal-link-scan-limit logic in Site_Graph.
 */
final class SiteGraphTest extends TestCase {

	/** Reset the get_posts stub after each test. */
	protected function tearDown(): void {
		global $__goals_ac_test_get_posts_fn;
		$__goals_ac_test_get_posts_fn = null;
	}

	/**
	 * Build a minimal WP_Post-like object.
	 *
	 * @param int    $id      Post ID.
	 * @param string $content post_content value.
	 * @return \stdClass
	 */
	private function make_post( int $id, string $content = '' ): \stdClass {
		$post               = new \stdClass();
		$post->ID           = $id;
		$post->post_title   = 'Post ' . $id;
		$post->post_name    = 'post-' . $id;
		$post->post_content = $content;
		$post->post_date    = '2024-01-01 00:00:00';
		$post->post_modified = '2024-01-01 00:00:00';
		return $post;
	}

	/**
	 * Install a stub that serves N posts in batches of $per_page.
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

	public function test_under_cap_returns_all_posts_no_truncated(): void {
		$this->stub_posts( 50 );

		$graph = ( new Site_Graph() )->export();

		$this->assertCount( 50, $graph['posts'] );
		$this->assertArrayNotHasKey( 'truncated', $graph );
		$this->assertArrayNotHasKey( 'post_limit', $graph );
	}

	public function test_exactly_at_cap_sets_truncated(): void {
		$this->stub_posts( Site_Graph::SITE_GRAPH_POST_LIMIT );

		$graph = ( new Site_Graph() )->export();

		$this->assertCount( Site_Graph::SITE_GRAPH_POST_LIMIT, $graph['posts'] );
		$this->assertTrue( $graph['truncated'] );
		$this->assertSame( Site_Graph::SITE_GRAPH_POST_LIMIT, $graph['post_limit'] );
	}

	public function test_over_cap_trims_to_limit_and_sets_truncated(): void {
		$this->stub_posts( Site_Graph::SITE_GRAPH_POST_LIMIT + 300 );

		$graph = ( new Site_Graph() )->export();

		$this->assertCount( Site_Graph::SITE_GRAPH_POST_LIMIT, $graph['posts'] );
		$this->assertTrue( $graph['truncated'] );
	}

	public function test_internal_links_scan_only_most_recent_subset(): void {
		// Post IDs 1–500; only ID 499 has an internal link.
		// If scanning were unbounded it would include ID 499 regardless;
		// but ID 499 falls inside the last-200 slice (IDs 301-500), so the
		// link must appear. A post outside the slice (e.g. ID 1 with a link)
		// must not appear.
		global $__goals_ac_test_get_posts_fn;

		$site_url  = 'https://example.test';
		$all_posts = array();
		for ( $i = 1; $i <= Site_Graph::SITE_GRAPH_POST_LIMIT; ++$i ) {
			$content = '';
			if ( 1 === $i ) {
				// Outside link-scan slice — must NOT appear in internal_links.
				$content = '<a href="' . $site_url . '/early">early</a>';
			}
			if ( 499 === $i ) {
				// Inside link-scan slice — MUST appear in internal_links.
				$content = '<a href="' . $site_url . '/recent">recent</a>';
			}
			$all_posts[] = $this->make_post( $i, $content );
		}

		$__goals_ac_test_get_posts_fn = function ( $args ) use ( $all_posts ) {
			$per_page = 100;
			$page     = (int) ( $args['paged'] ?? 1 );
			return array_slice( $all_posts, ( $page - 1 ) * $per_page, $per_page );
		};

		$graph         = ( new Site_Graph() )->export();
		$target_paths  = array_column( $graph['internal_links'], 'target_path' );

		$this->assertContains( '/recent', $target_paths, 'Recent post link must be scanned' );
		$this->assertNotContains( '/early', $target_paths, 'Early post link must be skipped (outside scan slice)' );
	}
}
