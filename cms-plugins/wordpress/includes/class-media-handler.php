<?php
/**
 * Media upload handler — sideloads WebP images into the WordPress media library.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Sideloads base64-encoded images into the WordPress media library.
 */
class Media_Handler {

	/**
	 * Handle a media upload request (base64 payload).
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle( \WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( empty( $params['data'] ) || empty( $params['filename'] ) ) {
			return new \WP_Error(
				'goals_ac_invalid_media',
				\__( 'filename and data (base64) are required.', 'goals-ac' ),
				array( 'status' => 400 )
			);
		}

		$filename  = \sanitize_file_name( $params['filename'] );
		$mime_type = \sanitize_mime_type( $params['mime_type'] ?? 'image/webp' );
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- REST payload is base64 image data.
		$raw = \base64_decode( $params['data'], true );

		if ( false === $raw || 0 === \strlen( $raw ) ) {
			return new \WP_Error(
				'goals_ac_invalid_media',
				\__( 'Invalid base64 image data.', 'goals-ac' ),
				array( 'status' => 400 )
			);
		}

		$max_bytes = \wp_max_upload_size();
		if ( $max_bytes > 0 && \strlen( $raw ) > $max_bytes ) {
			return new \WP_Error(
				'goals_ac_media_too_large',
				\sprintf(
					/* translators: 1: uploaded size in bytes, 2: the site's max upload size in bytes. */
					\__( 'Image is %1$d bytes, which exceeds this site\'s %2$d byte upload limit.', 'goals-ac' ),
					\strlen( $raw ),
					$max_bytes
				),
				array( 'status' => 413 )
			);
		}

		$upload_dir = \wp_upload_dir();
		if ( ! empty( $upload_dir['error'] ) ) {
			return new \WP_Error(
				'goals_ac_upload_failed',
				$upload_dir['error'],
				array( 'status' => 500 )
			);
		}

		$tmp_file = $upload_dir['path'] . '/' . \wp_unique_filename( $upload_dir['path'], $filename );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- temp sideload file before media_handle_sideload().
		if ( false === \file_put_contents( $tmp_file, $raw ) ) {
			return new \WP_Error(
				'goals_ac_upload_failed',
				\__( 'Could not write temporary file.', 'goals-ac' ),
				array( 'status' => 500 )
			);
		}

		$file_array = array(
			'name'     => $filename,
			'tmp_name' => $tmp_file,
			'type'     => $mime_type,
			'error'    => 0,
			'size'     => \filesize( $tmp_file ),
		);

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$attachment_id = \media_handle_sideload( $file_array, 0 );

		if ( \is_wp_error( $attachment_id ) ) {
			// phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.unlink_unlink
			@\unlink( $tmp_file );
			return $attachment_id;
		}

		if ( ! empty( $params['alt'] ) ) {
			\update_post_meta( $attachment_id, '_wp_attachment_image_alt', \sanitize_text_field( $params['alt'] ) );
		}
		if ( ! empty( $params['title'] ) ) {
			\wp_update_post(
				array(
					'ID'         => $attachment_id,
					'post_title' => \sanitize_text_field( $params['title'] ),
				)
			);
		}
		if ( ! empty( $params['caption'] ) ) {
			\wp_update_post(
				array(
					'ID'           => $attachment_id,
					'post_excerpt' => \sanitize_text_field( $params['caption'] ),
				)
			);
		}

		$source_url = \wp_get_attachment_url( $attachment_id );

		return \rest_ensure_response(
			array(
				'id'         => $attachment_id,
				'source_url' => $source_url ? $source_url : '',
			)
		);
	}
}
