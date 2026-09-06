<?php
/**
 * Site graph export — posts, taxonomies, and internal links.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Exports published content and internal links for goals.ac.
 *
 * @note Ceiling: post export is capped at SITE_GRAPH_POST_LIMIT (500) and
 *       internal-link scanning at SITE_GRAPH_LINK_SCAN_LIMIT (200 most-recent).
 *       Upgrade path: push full graph incrementally via a cursor/offset endpoint
 *       instead of a single bulk export.
 */
class Site_Graph {

	/** Hard cap on total posts fetched. Response includes truncated=true when hit. */
	const SITE_GRAPH_POST_LIMIT = 500;

	/** Subset of (most-recent) posts whose content is regex-scanned for links. */
	const SITE_GRAPH_LINK_SCAN_LIMIT = 200;

	/**
	 * Memo for one export() pass — posts + internal links share the same query.
	 *
	 * @var array<int, \WP_Post>|null
	 */
	private $published_posts_cache = null;

	/**
	 * Export the site graph as JSON.
	 *
	 * @return array{posts: array, categories: array, tags: array, internal_links: array, truncated?: bool, post_limit?: int}
	 */
	public function export(): array {
		$this->published_posts_cache = null;
		$truncated                   = \count( $this->query_published_posts() ) >= self::SITE_GRAPH_POST_LIMIT;

		$result = array(
			'posts'          => $this->get_posts(),
			'categories'     => $this->get_terms( 'category' ),
			'tags'           => $this->get_terms( 'post_tag' ),
			'internal_links' => $this->get_internal_links(),
		);

		if ( $truncated ) {
			$result['truncated']  = true;
			$result['post_limit'] = self::SITE_GRAPH_POST_LIMIT;
		}

		return $result;
	}

	/**
	 * Collect published posts for the site graph.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private function get_posts(): array {
		return \array_map(
			function ( $post ) {
				$categories = \wp_get_post_categories( $post->ID, array( 'fields' => 'ids' ) );
				$tags       = \wp_get_post_tags( $post->ID, array( 'fields' => 'ids' ) );

				return array(
					'id'              => $post->ID,
					'title'           => $post->post_title,
					'slug'            => $post->post_name,
					'url'             => \get_permalink( $post->ID ),
					'excerpt'         => \wp_trim_words( $post->post_content, 30, '...' ),
					'body'            => \wp_trim_words( \wp_strip_all_tags( $post->post_content ), 80, '...' ),
					'contentMarkdown' => \wp_trim_words( \wp_strip_all_tags( $post->post_content ), 80, '...' ),
					'categories'      => $categories,
					'tags'            => $tags,
					'published_at'    => \gmdate( 'c', \strtotime( $post->post_date ) ),
					'updated_at'      => \gmdate( 'c', \strtotime( $post->post_modified ) ),
				);
			},
			$this->query_published_posts()
		);
	}

	/**
	 * Fetch published posts in pages of 100, capped at SITE_GRAPH_POST_LIMIT.
	 *
	 * @return array<int, \WP_Post>
	 */
	private function query_published_posts(): array {
		if ( null !== $this->published_posts_cache ) {
			return $this->published_posts_cache;
		}

		$per_page = 100;
		$page     = 1;
		$all      = array();

		do {
			$batch       = \get_posts(
				array(
					'post_type'      => 'post',
					'post_status'    => 'publish',
					'posts_per_page' => $per_page,
					'paged'          => $page,
					'orderby'        => 'ID',
					'order'          => 'ASC',
				)
			);
			$batch_count = \count( $batch );
			$all         = \array_merge( $all, $batch );
			$all_count   = \count( $all );
			++$page;
		} while ( $batch_count === $per_page && $all_count < self::SITE_GRAPH_POST_LIMIT );

		// Trim to cap (safety: last batch could push count slightly past the limit).
		if ( $all_count > self::SITE_GRAPH_POST_LIMIT ) {
			$all = \array_slice( $all, 0, self::SITE_GRAPH_POST_LIMIT );
		}

		$this->published_posts_cache = $all;
		return $all;
	}

	/**
	 * Collect taxonomy terms for the site graph.
	 *
	 * @param string $taxonomy Taxonomy slug.
	 * @return array<int, array<string, mixed>>
	 */
	private function get_terms( string $taxonomy ): array {
		$terms = \get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
			)
		);

		if ( \is_wp_error( $terms ) ) {
			return array();
		}

		return \array_map(
			function ( $term ) {
				return array(
					'id'     => $term->term_id,
					'name'   => $term->name,
					'slug'   => $term->slug,
					'count'  => $term->count,
					'parent' => $term->parent,
				);
			},
			$terms
		);
	}

	/**
	 * Extract internal links from the most-recent SITE_GRAPH_LINK_SCAN_LIMIT posts.
	 *
	 * Scanning only the tail keeps regex cost O(scan_limit) not O(all posts).
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private function get_internal_links(): array {
		$site_url    = \untrailingslashit( \get_site_url() );
		$links       = array();
		$posts_slice = \array_slice( $this->query_published_posts(), -self::SITE_GRAPH_LINK_SCAN_LIMIT );

		foreach ( $posts_slice as $post ) {
			$content = $post->post_content;
			if ( empty( $content ) ) {
				continue;
			}

			\preg_match_all( '/<a\s[^>]*href=["\']([^"\']+)["\']/i', $content, $matches );

			foreach ( $matches[1] as $href ) {
				$href = \esc_url_raw( $href );

				if ( 0 === \strpos( $href, $site_url ) ) {
					$target_path = \wp_parse_url( $href, PHP_URL_PATH );
					if ( $target_path ) {
						$links[] = array(
							'source_id'   => $post->ID,
							'source_slug' => $post->post_name,
							'target_url'  => $href,
							'target_path' => $target_path,
						);
					}
				}
			}
		}

		return $links;
	}
}
