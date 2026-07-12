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

defined('ABSPATH') || exit;

class Rest_API {

    private const NAMESPACE = 'goals-ac/v1';

    private \GoalsAC\Shared\NonceStore $nonce_store;
    private \GoalsAC\Shared\KeyStore $key_store;

    public function __construct(\GoalsAC\Shared\NonceStore $nonce_store, \GoalsAC\Shared\KeyStore $key_store) {
        $this->nonce_store = $nonce_store;
        $this->key_store   = $key_store;
    }

    /**
     * Register cron and DB maintenance hooks.
     */
    public function register_maintenance(): void {
        if (get_option('goals_ac_db_version', '0.0.0') !== GOALS_AC_VERSION) {
            WP_Nonce_Store::create_table();
            update_option('goals_ac_db_version', GOALS_AC_VERSION);
        }

        add_action('goals_ac_cleanup_nonces', function () {
            $this->nonce_store->cleanup();
        });
    }

    /**
     * Register the REST routes.
     */
    public function register_routes(): void {
        // Health check — no auth required.
        register_rest_route(self::NAMESPACE, '/health', [
            'methods'             => 'GET',
            'callback'            => [$this, 'handle_health'],
            'permission_callback' => '__return_true',
        ]);

        // Site graph — HMAC auth required.
        register_rest_route(self::NAMESPACE, '/site-graph', [
            'methods'             => 'GET',
            'callback'            => [$this, 'handle_site_graph'],
            'permission_callback' => [$this, 'verify_hmac'],
        ]);

        // Content publish — HMAC auth required.
        register_rest_route(self::NAMESPACE, '/content', [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'handle_content'],
            'permission_callback' => [$this, 'verify_hmac'],
            'args'                => [
                'title' => [
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'content' => [
                    'type'              => 'string',
                    'sanitize_callback' => 'wp_kses_post',
                ],
                'status' => [
                    'type'              => 'string',
                    'enum'              => ['draft', 'publish', 'pending'],
                    'default'           => 'draft',
                    'sanitize_callback' => 'sanitize_key',
                ],
                'slug' => [
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_title',
                ],
                'update_id' => [
                    'type'    => 'integer',
                    'default' => 0,
                ],
            ],
        ]);

        // Schema injection — HMAC auth required.
        register_rest_route(self::NAMESPACE, '/schema', [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'handle_schema'],
            'permission_callback' => [$this, 'verify_hmac'],
            'args'                => [
                'json_ld' => [
                    'type' => ['array', 'object', 'string', 'null'],
                ],
                'llms_txt' => [
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field',
                ],
            ],
        ]);
    }

    /**
     * Permission callback: verify HMAC signature via shared library.
     */
    public function verify_hmac(\WP_REST_Request $request): bool|\WP_Error {
        $site_key = get_option('goals_ac_site_key', '');

        $result = \GoalsAC\Shared\HMACAuth::verify([
            'method'    => $request->get_method(),
            'path'      => $request->get_route(),
            'timestamp' => $request->get_header('X-Goals-Timestamp'),
            'nonce'     => $request->get_header('X-Goals-Nonce'),
            'signature' => $request->get_header('X-Goals-Signature'),
            'body'      => $request->get_body(),
        ], $site_key, $this->nonce_store);

        if (is_object($result) && isset($result->code)) {
            return new \WP_Error(
                $result->code,
                $result->message,
                ['status' => $result->status]
            );
        }

        return true;
    }

    /**
     * GET /goals-ac/v1/health
     */
    public function handle_health(\WP_REST_Request $request) {
        return $this->with_request_id(rest_ensure_response(\GoalsAC\Shared\Contract::healthResponse(
            get_bloginfo('version'),
            ['version' => GOALS_AC_VERSION]
        )), $request);
    }

    /**
     * GET /goals-ac/v1/site-graph
     */
    public function handle_site_graph(\WP_REST_Request $request) {
        try {
            $site_graph = new Site_Graph();
            return $this->with_request_id(rest_ensure_response($site_graph->export()), $request);
        } catch (\Throwable $error) {
            return $this->handle_error('SITE_GRAPH_FAILED', 'Unable to export site graph.', $error, $request);
        }
    }

    /**
     * POST /goals-ac/v1/content
     */
    public function handle_content(\WP_REST_Request $request) {
        try {
            $handler = new Publish_Handler($this->key_store);
            return $this->with_request_id(rest_ensure_response($handler->handle($request)), $request);
        } catch (\Throwable $error) {
            return $this->handle_error('CONTENT_PUBLISH_FAILED', 'Unable to publish content.', $error, $request);
        }
    }

    /**
     * POST /goals-ac/v1/schema
     */
    public function handle_schema(\WP_REST_Request $request) {
        try {
            $injector = new Schema_Inject();
            return $this->with_request_id(rest_ensure_response($injector->handle($request)), $request);
        } catch (\Throwable $error) {
            return $this->handle_error('SCHEMA_STORE_FAILED', 'Unable to store schema configuration.', $error, $request);
        }
    }

    private function request_id(\WP_REST_Request $request): string {
        $supplied = $request->get_header('X-Request-ID');
        return is_string($supplied) && preg_match('/^[a-zA-Z0-9._-]{1,128}$/', $supplied)
            ? $supplied
            : wp_generate_uuid4();
    }

    private function with_request_id(\WP_REST_Response $response, \WP_REST_Request $request): \WP_REST_Response {
        $response->header('X-Request-ID', $this->request_id($request));
        return $response;
    }

    private function handle_error(string $code, string $message, \Throwable $error, \WP_REST_Request $request): \WP_REST_Response {
        $request_id = $this->request_id($request);
        error_log(wp_json_encode([
            'service' => 'goals-ac-wordpress',
            'level' => 'error',
            'request_id' => $request_id,
            'code' => $code,
            'error_class' => get_class($error),
            'error_message' => $error->getMessage(),
        ]));

        $response = new \WP_REST_Response([
            'error' => $message,
            'code' => $code,
            'requestId' => $request_id,
        ], 500);
        $response->header('X-Request-ID', $request_id);
        return $response;
    }
}
