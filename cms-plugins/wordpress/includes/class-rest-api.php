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
        return rest_ensure_response(\GoalsAC\Shared\Contract::healthResponse(
            get_bloginfo('version'),
            ['version' => GOALS_AC_VERSION]
        ));
    }

    /**
     * GET /goals-ac/v1/site-graph
     */
    public function handle_site_graph(\WP_REST_Request $request) {
        $site_graph = new Site_Graph();
        return rest_ensure_response($site_graph->export());
    }

    /**
     * POST /goals-ac/v1/content
     */
    public function handle_content(\WP_REST_Request $request) {
        $handler = new Publish_Handler($this->key_store);
        return $handler->handle($request);
    }

    /**
     * POST /goals-ac/v1/schema
     */
    public function handle_schema(\WP_REST_Request $request) {
        $injector = new Schema_Inject();
        return $injector->handle($request);
    }
}
