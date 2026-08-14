<?php
/**
 * Internal link write-back.
 *
 * A newly published post starts orphaned: nothing on the site links to it, so
 * it inherits none of the site's earned authority. This inserts a contextual
 * link to the new post into existing posts that already discuss the topic.
 *
 * Which posts to link from is decided by goals.ac, which holds the site graph
 * and the topic scoring. This class only performs the insertion, so the
 * matching logic stays in one place and under test.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Inserts contextual links into existing published posts.
 */
class Internal_Links {

	/**
	 * Maximum posts modified in a single request.
	 *
	 * A new post needs a handful of contextual links, not a site-wide sweep.
	 * Bulk edits to published content are hard to review and hard to undo.
	 */
	private const MAX_POSTS = 5;

	/**
	 * Insert a link to `$target_url` into each of `$post_ids`.
	 *
	 * Skips rather than forces: a post that already links to the target, or
	 * that never mentions the anchor phrase in plain text, is left untouched.
	 * A missed link costs nothing; a mangled published post costs trust.
	 *
	 * @param string             $target_url  Absolute URL of the new post.
	 * @param string             $anchor_text Phrase to turn into the link.
	 * @param array<int, int>    $post_ids    Posts to link from.
	 * @return array{updated: array<int, array<string, mixed>>, skipped: array<int, array<string, mixed>>}
	 */
	public function insert( string $target_url, string $anchor_text, array $post_ids ): array {
		$updated = array();
		$skipped = array();

		$target_url  = \esc_url_raw( $target_url );
		$anchor_text = \trim( \wp_strip_all_tags( $anchor_text ) );

		if ( '' === $target_url || '' === $anchor_text ) {
			return array( 'updated' => $updated, 'skipped' => $skipped );
		}

		foreach ( \array_slice( $post_ids, 0, self::MAX_POSTS ) as $post_id ) {
			$post_id = (int) $post_id;
			$post    = \get_post( $post_id );

			if ( ! $post || 'publish' !== $post->post_status ) {
				$skipped[] = array( 'post_id' => $post_id, 'reason' => 'not_published' );
				continue;
			}

			if ( $this->already_links_to( $post->post_content, $target_url ) ) {
				$skipped[] = array( 'post_id' => $post_id, 'reason' => 'already_linked' );
				continue;
			}

			$linked = $this->link_first_mention( $post->post_content, $anchor_text, $target_url );
			if ( null === $linked ) {
				$skipped[] = array( 'post_id' => $post_id, 'reason' => 'anchor_not_found' );
				continue;
			}

			$result = \wp_update_post(
				array(
					'ID'           => $post_id,
					'post_content' => $linked,
				),
				true
			);

			if ( \is_wp_error( $result ) ) {
				$skipped[] = array( 'post_id' => $post_id, 'reason' => 'update_failed' );
				continue;
			}

			$updated[] = array(
				'post_id' => $post_id,
				'url'     => \get_permalink( $post_id ),
			);
		}

		return array( 'updated' => $updated, 'skipped' => $skipped );
	}

	/**
	 * Whether the content already links to the target URL.
	 *
	 * @param string $content    Post content.
	 * @param string $target_url Absolute URL.
	 */
	private function already_links_to( string $content, string $target_url ): bool {
		return false !== \strpos( $content, 'href="' . $target_url . '"' )
			|| false !== \strpos( $content, "href='" . $target_url . "'" );
	}

	/**
	 * Wrap the first plain-text occurrence of `$anchor_text` in a link.
	 *
	 * Only text outside HTML tags and outside existing anchors is considered,
	 * so this cannot nest a link, break an attribute, or corrupt a Gutenberg
	 * block delimiter. Returns null when no safe occurrence exists.
	 *
	 * @param string $content     Post content.
	 * @param string $anchor_text Phrase to link.
	 * @param string $target_url  Absolute URL.
	 * @return string|null Updated content, or null when the anchor was not found.
	 */
	private function link_first_mention( string $content, string $anchor_text, string $target_url ): ?string {
		// Split into alternating safe text and untouchable markup. Existing
		// anchors are captured whole so their inner text is never matched.
		$segments = \preg_split(
			'#(<a\b[^>]*>.*?</a>|<[^>]+>|<!--.*?-->)#is',
			$content,
			-1,
			PREG_SPLIT_DELIM_CAPTURE
		);

		if ( ! \is_array( $segments ) ) {
			return null;
		}

		// Match across whatever whitespace separates the words in the source.
		// goals.ac picks the anchor from flattened site-graph text, so a phrase
		// broken by a newline in the real post must still match.
		$pattern  = '/' . \str_replace( ' ', '\s+', \preg_quote( $anchor_text, '/' ) ) . '/i';
		$replaced = false;

		foreach ( $segments as $index => $segment ) {
			// Odd indices are the captured delimiters — markup, leave alone.
			if ( 1 === $index % 2 || '' === $segment ) {
				continue;
			}

			$result = \preg_replace_callback(
				$pattern,
				function ( $matches ) use ( $target_url ) {
					return '<a href="' . \esc_url( $target_url ) . '">' . $matches[0] . '</a>';
				},
				$segment,
				1,
				$count
			);

			if ( null !== $result && $count > 0 ) {
				$segments[ $index ] = $result;
				$replaced           = true;
				break;
			}
		}

		return $replaced ? \implode( '', $segments ) : null;
	}
}
