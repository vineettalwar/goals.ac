<?php
/**
 * Idempotent content publish handler.
 *
 * Uses GoalsAC\Shared\Idempotency for duplicate prevention.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and updates WordPress posts from goals.ac publish requests.
 */
class Publish_Handler {

	/**
	 * Idempotency key storage.
	 *
	 * @var \GoalsAC\Shared\KeyStore
	 */
	private \GoalsAC\Shared\KeyStore $key_store;

	/**
	 * Create the publish handler.
	 *
	 * @param \GoalsAC\Shared\KeyStore $key_store Idempotency storage backend.
	 */
	public function __construct( \GoalsAC\Shared\KeyStore $key_store ) {
		$this->key_store = $key_store;
	}

	/**
	 * Handle a content publish request.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle( \WP_REST_Request $request ) {
		$idempotency_key = $request->get_header( 'X-Idempotency-Key' );

		$existing = \GoalsAC\Shared\Idempotency::check( $idempotency_key, $this->key_store );
		if ( null !== $existing ) {
			return \rest_ensure_response( $existing );
		}

		$params = $request->get_json_params();
		if ( empty( $params ) ) {
			return new \WP_Error(
				'goals_ac_invalid_request',
				\__( 'Request body must be JSON.', 'goals-ac' ),
				array( 'status' => 400 )
			);
		}

		$title     = \sanitize_text_field( $params['title'] ?? '' );
		$content   = \wp_kses_post( $params['content'] ?? '' );
		$status    = \in_array( ( $params['status'] ?? 'draft' ), array( 'draft', 'publish', 'pending' ), true )
					? $params['status']
					: 'draft';
		$slug      = \sanitize_title( $params['slug'] ?? '' );
		$update_id = \intval( $params['update_id'] ?? 0 );

		if ( empty( $title ) && empty( $content ) ) {
			return new \WP_Error(
				'goals_ac_empty_content',
				\__( 'Title or content is required.', 'goals-ac' ),
				array( 'status' => 400 )
			);
		}

		if ( $update_id > 0 && 'post' === \get_post_type( $update_id ) ) {
			$post_id = $this->update_post( $update_id, $title, $content, $status, $slug, $params );
			$action  = 'updated';
		} else {
			$post_id = $this->create_post( $title, $content, $status, $slug, $params );
			$action  = 'created';
		}

		if ( \is_wp_error( $post_id ) ) {
			return $post_id;
		}

		$result = array(
			'remote_id' => $post_id,
			'url'       => \get_permalink( $post_id ),
			'action'    => $action,
		);

		\GoalsAC\Shared\Idempotency::store( $idempotency_key, $result, $this->key_store );

		return \rest_ensure_response( $result );
	}

	/**
	 * Create a new WordPress post.
	 *
	 * @param string               $title   Post title.
	 * @param string               $content Post content.
	 * @param string               $status  Post status.
	 * @param string               $slug    Post slug.
	 * @param array<string, mixed> $params  Additional publish fields.
	 * @return int|\WP_Error
	 */
	private function create_post(
		string $title,
		string $content,
		string $status,
		string $slug,
		array $params
	): int|\WP_Error {
		$author_id = \get_current_user_id();
		$post_data = array(
			'post_title'   => $title,
			'post_content' => $content,
			'post_status'  => $status,
			'post_type'    => 'post',
			'post_author'  => $author_id ? $author_id : 1,
		);

		if ( ! empty( $slug ) ) {
			$post_data['post_name'] = $slug;
		}

		$categories = $params['categories'] ?? array();
		if ( ! empty( $categories ) ) {
			$post_data['post_category'] = \array_map( 'intval', $categories );
		}

		$tags = $params['tags'] ?? array();
		if ( ! empty( $tags ) ) {
			$post_data['tags_input'] = \array_map( 'intval', $tags );
		}

		$post_id = \wp_insert_post( $post_data, true );

		if ( \is_wp_error( $post_id ) ) {
			return $post_id;
		}

		$this->set_post_meta( $post_id, $params );

		return $post_id;
	}

	/**
	 * Update an existing WordPress post.
	 *
	 * @param int                  $post_id Post ID.
	 * @param string               $title   Post title.
	 * @param string               $content Post content.
	 * @param string               $status  Post status.
	 * @param string               $slug    Post slug.
	 * @param array<string, mixed> $params  Additional publish fields.
	 * @return int|\WP_Error
	 */
	private function update_post(
		int $post_id,
		string $title,
		string $content,
		string $status,
		string $slug,
		array $params
	): int|\WP_Error {
		$post_data = array(
			'ID'           => $post_id,
			'post_title'   => $title,
			'post_content' => $content,
			'post_status'  => $status,
		);

		if ( ! empty( $slug ) ) {
			$post_data['post_name'] = $slug;
		}

		$result = \wp_update_post( $post_data, true );

		if ( \is_wp_error( $result ) ) {
			return $result;
		}

		$categories = $params['categories'] ?? array();
		if ( ! empty( $categories ) ) {
			\wp_set_post_categories( $post_id, \array_map( 'intval', $categories ) );
		}

		$tags = $params['tags'] ?? array();
		if ( ! empty( $tags ) ) {
			\wp_set_post_tags( $post_id, \array_map( 'intval', $tags ) );
		}

		$this->set_post_meta( $post_id, $params );

		return $post_id;
	}

	/**
	 * Apply featured image, SEO, and custom meta fields to a post.
	 *
	 * @param int                  $post_id Post ID.
	 * @param array<string, mixed> $params  Publish payload.
	 */
	private function set_post_meta( int $post_id, array $params ): void {
		$featured_image_id = \intval( $params['featured_image_id'] ?? 0 );
		if ( $featured_image_id > 0 ) {
			\set_post_thumbnail( $post_id, $featured_image_id );
		}

		$editor_mode = \sanitize_key( $params['editor_mode'] ?? '' );
		if ( ! empty( $editor_mode ) ) {
			\update_post_meta( $post_id, '_goals_ac_editor_mode', $editor_mode );
		}

		$elementor_data = $params['elementor_data'] ?? '';
		if ( ! empty( $elementor_data ) && \is_string( $elementor_data ) ) {
			\update_post_meta( $post_id, '_elementor_data', \wp_slash( $elementor_data ) );
			\update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
		}

		$meta = $params['meta'] ?? array();
		if ( ! empty( $params['seo'] ) && \is_array( $params['seo'] ) ) {
			$meta = \array_merge( $meta, Seo_Meta_Mapper::map( $params['seo'] ) );
		}
		foreach ( $meta as $key => $value ) {
			$sanitized_key = \sanitize_key( $key );
			\update_post_meta( $post_id, $sanitized_key, \sanitize_text_field( $value ) );
		}
	}
}
