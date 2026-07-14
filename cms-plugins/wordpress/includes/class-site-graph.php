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
 */
class Site_Graph {

	/**
	 * Export the site graph as JSON.
	 *
	 * @return array{posts: array, categories: array, tags: array, internal_links: array}
	 */
	public function export(): array {
		return array(
			'posts'          => $this->get_posts(),
			'categories'     => $this->get_terms( 'category' ),
			'tags'           => $this->get_terms( 'post_tag' ),
			'internal_links' => $this->get_internal_links(),
		);
	}

	/**
	 * Collect published posts for the site graph.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private function get_posts(): array {
		$posts = \get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'posts_per_page' => 500,
				'orderby'        => 'ID',
				'order'          => 'ASC',
			)
		);

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
			$posts
		);
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
	 * Extract internal links from published post content.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private function get_internal_links(): array {
		$site_url = \untrailingslashit( \get_site_url() );
		$posts    = \get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
			)
		);

		$links = array();

		foreach ( $posts as $post ) {
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
