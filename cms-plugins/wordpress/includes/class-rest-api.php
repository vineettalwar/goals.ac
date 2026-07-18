<?php
/**
 * REST API route registration.
 *
 * Uses GoalsAC\Shared\HMACAuth for request verification and
 * GoalsAC\Shared\Idempotency for idempotent publish checks.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Registers goals.ac REST API routes and request handlers.
 */
class Rest_API {

	private const NAMESPACE = 'goals-ac/v1';

	/**
	 * Nonce storage for HMAC replay protection.
	 *
	 * @var \GoalsAC\Shared\NonceStore
	 */
	private \GoalsAC\Shared\NonceStore $nonce_store;

	/**
	 * Idempotency key storage.
	 *
	 * @var \GoalsAC\Shared\KeyStore
	 */
	private \GoalsAC\Shared\KeyStore $key_store;

	/**
	 * Create the REST API handler.
	 *
	 * @param \GoalsAC\Shared\NonceStore $nonce_store Nonce storage backend.
	 * @param \GoalsAC\Shared\KeyStore   $key_store   Idempotency storage backend.
	 */
	public function __construct( \GoalsAC\Shared\NonceStore $nonce_store, \GoalsAC\Shared\KeyStore $key_store ) {
		$this->nonce_store = $nonce_store;
		$this->key_store   = $key_store;
	}

	/**
	 * Register cron and DB maintenance hooks.
	 */
	public function register_maintenance(): void {
		if ( \get_option( 'goals_ac_db_version', '0.0.0' ) !== GOALS_AC_VERSION ) {
			WP_Nonce_Store::create_table();
			\update_option( 'goals_ac_db_version', GOALS_AC_VERSION );
		}

		\add_action(
			'goals_ac_cleanup_nonces',
			function () {
				$this->nonce_store->cleanup();
			}
		);
	}

	/**
	 * Register the REST routes.
	 */
	public function register_routes(): void {
		// Health check — no auth required.
		\register_rest_route(
			self::NAMESPACE,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle_health' ),
				'permission_callback' => '__return_true',
			)
		);

		// Site graph — HMAC auth required.
		\register_rest_route(
			self::NAMESPACE,
			'/site-graph',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle_site_graph' ),
				'permission_callback' => array( $this, 'verify_hmac' ),
			)
		);

		// Content publish — HMAC auth required.
		\register_rest_route(
			self::NAMESPACE,
			'/content',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_content' ),
				'permission_callback' => array( $this, 'verify_hmac' ),
				'args'                => array(
					'title'     => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'content'   => array(
						'type'              => 'string',
						'sanitize_callback' => 'wp_kses_post',
					),
					'status'    => array(
						'type'              => 'string',
						'enum'              => array( 'draft', 'publish', 'pending' ),
						'default'           => 'draft',
						'sanitize_callback' => 'sanitize_key',
					),
					'slug'      => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_title',
					),
					'update_id' => array(
						'type'    => 'integer',
						'default' => 0,
					),
				),
			)
		);

		// Schema injection — HMAC auth required.
		\register_rest_route(
			self::NAMESPACE,
			'/schema',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_schema' ),
				'permission_callback' => array( $this, 'verify_hmac' ),
				'args'                => array(
					'json_ld'  => array(
						'type' => array( 'array', 'object', 'string', 'null' ),
					),
					'llms_txt' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
					),
				),
			)
		);

		// Media upload — HMAC auth required.
		\register_rest_route(
			self::NAMESPACE,
			'/media',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_media' ),
				'permission_callback' => array( $this, 'verify_hmac' ),
			)
		);
	}

	/**
	 * Permission callback: verify HMAC signature via shared library.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 */
	public function verify_hmac( \WP_REST_Request $request ): bool|\WP_Error {
		$site_key = \get_option( 'goals_ac_site_key', '' );

		$result = \GoalsAC\Shared\HMACAuth::verify(
			array(
				'method'    => $request->get_method(),
				'path'      => $request->get_route(),
				'timestamp' => $request->get_header( 'X-Goals-Timestamp' ),
				'nonce'     => $request->get_header( 'X-Goals-Nonce' ),
				'signature' => $request->get_header( 'X-Goals-Signature' ),
				'body'      => $request->get_body(),
			),
			$site_key,
			$this->nonce_store
		);

		if ( is_object( $result ) && isset( $result->code ) ) {
			return new \WP_Error(
				$result->code,
				$result->message,
				array( 'status' => $result->status )
			);
		}

		return true;
	}

	/**
	 * GET /goals-ac/v1/health
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public function handle_health( \WP_REST_Request $request ) {
		$capabilities = \GoalsAC\Shared\Contract::defaultCapabilities();
		if ( \class_exists( '\Goals_AC\Seo_Meta_Mapper' ) ) {
			$capabilities['seo_meta']   = true;
			$capabilities['seo_plugin'] = \Goals_AC\Seo_Meta_Mapper::detect_plugin();
		}

		$detected_builders = array( 'gutenberg' );
		if ( \defined( 'ELEMENTOR_VERSION' ) || \class_exists( '\Elementor\Plugin' ) ) {
			$detected_builders[] = 'elementor';
		}
		if ( \defined( 'ET_BUILDER_VERSION' ) || \function_exists( 'et_setup_theme' ) ) {
			$detected_builders[] = 'divi';
		}

		$recommended = 'classic';
		if ( \in_array( 'elementor', $detected_builders, true ) ) {
			$recommended = 'elementor';
		} elseif ( \in_array( 'gutenberg', $detected_builders, true ) ) {
			$recommended = 'gutenberg';
		}

		return $this->with_request_id(
			\rest_ensure_response(
				\GoalsAC\Shared\Contract::healthResponse(
					\get_bloginfo( 'version' ),
					array(
						'version'                 => GOALS_AC_VERSION,
						'capabilities'            => $capabilities,
						'detected_builders'       => $detected_builders,
						'recommended_editor_mode' => $recommended,
					)
				)
			),
			$request
		);
	}

	/**
	 * GET /goals-ac/v1/site-graph
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public function handle_site_graph( \WP_REST_Request $request ) {
		try {
			$site_graph = new Site_Graph();
			return $this->with_request_id( \rest_ensure_response( $site_graph->export() ), $request );
		} catch ( \Throwable $error ) {
			return $this->handle_error( 'SITE_GRAPH_FAILED', 'Unable to export site graph.', $error, $request );
		}
	}

	/**
	 * POST /goals-ac/v1/content
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public function handle_content( \WP_REST_Request $request ) {
		try {
			$handler = new Publish_Handler( $this->key_store );
			return $this->with_request_id( \rest_ensure_response( $handler->handle( $request ) ), $request );
		} catch ( \Throwable $error ) {
			return $this->handle_error( 'CONTENT_PUBLISH_FAILED', 'Unable to publish content.', $error, $request );
		}
	}

	/**
	 * POST /goals-ac/v1/schema
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public function handle_schema( \WP_REST_Request $request ) {
		try {
			$injector = new Schema_Inject();
			return $this->with_request_id( \rest_ensure_response( $injector->handle( $request ) ), $request );
		} catch ( \Throwable $error ) {
			return $this->handle_error( 'SCHEMA_STORE_FAILED', 'Unable to store schema configuration.', $error, $request );
		}
	}

	/**
	 * POST /goals-ac/v1/media
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public function handle_media( \WP_REST_Request $request ) {
		try {
			$handler = new Media_Handler();
			return $this->with_request_id( \rest_ensure_response( $handler->handle( $request ) ), $request );
		} catch ( \Throwable $error ) {
			return $this->handle_error( 'MEDIA_UPLOAD_FAILED', 'Unable to upload media.', $error, $request );
		}
	}

	/**
	 * Resolve or generate a request ID for tracing.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 */
	private function request_id( \WP_REST_Request $request ): string {
		$supplied = $request->get_header( 'X-Request-ID' );
		return is_string( $supplied ) && preg_match( '/^[a-zA-Z0-9._-]{1,128}$/', $supplied )
			? $supplied
			: \wp_generate_uuid4();
	}

	/**
	 * Attach a request ID header to a REST response.
	 *
	 * @param \WP_REST_Response $response Outgoing REST response.
	 * @param \WP_REST_Request  $request  Incoming REST request.
	 */
	private function with_request_id( \WP_REST_Response $response, \WP_REST_Request $request ): \WP_REST_Response {
		$response->header( 'X-Request-ID', $this->request_id( $request ) );
		return $response;
	}

	/**
	 * Build a standardized error response and log the failure.
	 *
	 * @param string           $code    Error code.
	 * @param string           $message User-facing error message.
	 * @param \Throwable       $error   Caught exception.
	 * @param \WP_REST_Request $request Incoming REST request.
	 */
	private function handle_error( string $code, string $message, \Throwable $error, \WP_REST_Request $request ): \WP_REST_Response {
		$request_id = $this->request_id( $request );
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		\error_log(
			\wp_json_encode(
				array(
					'service'       => 'goals-ac-wordpress',
					'level'         => 'error',
					'request_id'    => $request_id,
					'code'          => $code,
					'error_class'   => get_class( $error ),
					'error_message' => $error->getMessage(),
				)
			)
		);

		$response = new \WP_REST_Response(
			array(
				'error'     => $message,
				'code'      => $code,
				'requestId' => $request_id,
			),
			500
		);
		$response->header( 'X-Request-ID', $request_id );
		return $response;
	}
}
