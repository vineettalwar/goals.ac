<?php
/**
 * Taxonomy ID/name resolution for publish payloads.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves category/tag values that may be numeric IDs or human-readable names.
 */
class Taxonomy {

	/**
	 * Resolve taxonomy values to term IDs.
	 *
	 * A name with no matching term is created, exactly like
	 * `resolve_tag_names()` does for tags via `wp_set_post_tags()`'s
	 * auto-create behaviour — categories and tags are both "labels goals.ac
	 * asked for", and the health check advertises `categories: true`, so
	 * silently dropping an unrecognized category is a silent content-loss
	 * bug, not a safety feature.
	 *
	 * @param array<int|string> $values   Category or tag values from the publish payload.
	 * @param string            $taxonomy WordPress taxonomy slug.
	 * @return array<int>
	 */
	public static function resolve_term_ids( array $values, string $taxonomy ): array {
		$ids = array();

		foreach ( $values as $value ) {
			if ( is_numeric( $value ) ) {
				$id = \intval( $value );
				if ( $id > 0 ) {
					$ids[] = $id;
				}
				continue;
			}

			if ( ! is_string( $value ) || '' === trim( $value ) ) {
				continue;
			}

			$name = trim( $value );
			$term = \get_term_by( 'name', $name, $taxonomy );
			if ( ! $term ) {
				$term = \get_term_by( 'slug', \sanitize_title( $name ), $taxonomy );
			}

			if ( ! $term ) {
				$created = \wp_insert_term( $name, $taxonomy );
				if ( ! \is_wp_error( $created ) ) {
					$ids[] = (int) $created['term_id'];
				}
				continue;
			}

			if ( ! \is_wp_error( $term ) ) {
				$ids[] = (int) $term->term_id;
			}
		}

		return \array_values( \array_unique( $ids ) );
	}

	/**
	 * Resolve tag values for wp_insert_post tags_input / wp_set_post_tags.
	 *
	 * @param array<int|string> $values Tag IDs or names.
	 * @return array<int|string>
	 */
	public static function resolve_tag_names( array $values ): array {
		$resolved = array();

		foreach ( $values as $value ) {
			if ( is_numeric( $value ) ) {
				$id = \intval( $value );
				if ( $id > 0 ) {
					$term = \get_term( $id, 'post_tag' );
					if ( $term && ! \is_wp_error( $term ) ) {
						$resolved[] = $term->name;
					}
				}
				continue;
			}

			if ( is_string( $value ) && '' !== trim( $value ) ) {
				$resolved[] = trim( $value );
			}
		}

		return \array_values( \array_unique( $resolved ) );
	}
}
