<?php
/**
 * Schema.org JSON-LD and llms.txt injection.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined('ABSPATH') || exit;

class Schema_Inject {

    private const SCHEMA_OPTION = 'goals_ac_schema_config';
    private const LLMSTXT_OPTION = 'goals_ac_llms_txt';

    public function init(): void {
        add_action('wp_head', [$this, 'inject_json_ld'], 1);
        add_action('wp_footer', [$this, 'inject_json_ld_footer'], 1);
    }

    public function handle(\WP_REST_Request $request) {
        $params = $request->get_json_params();
        if (empty($params)) {
            return new \WP_Error(
                'goals_ac_invalid_request',
                __('Request body must be JSON.', 'goals-ac'),
                ['status' => 400]
            );
        }

        $json_ld = $params['json_ld'] ?? [];
        if (!is_array($json_ld)) {
            $json_ld = [$json_ld];
        }

        foreach ($json_ld as $index => $schema) {
            if (is_string($schema)) {
                $decoded = json_decode($schema, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    return new \WP_Error(
                        'goals_ac_invalid_schema',
                        sprintf(__('Invalid JSON-LD at index %d.', 'goals-ac'), $index),
                        ['status' => 400]
                    );
                }
                $json_ld[$index] = $decoded;
            }
        }

        update_option(self::SCHEMA_OPTION, $json_ld, false);

        $llms_txt = $params['llms_txt'] ?? '';
        if (!empty($llms_txt)) {
            update_option(self::LLMSTXT_OPTION, sanitize_textarea_field($llms_txt), false);
        }

        $this->register_llms_txt_endpoint();

        return rest_ensure_response(['ok' => true]);
    }

    public function inject_json_ld(): void {
        if (!is_singular()) {
            return;
        }

        $schemas = get_option(self::SCHEMA_OPTION, []);
        if (empty($schemas)) {
            return;
        }

        foreach ($schemas as $schema) {
            if (is_string($schema)) {
                $decoded = json_decode($schema, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    continue;
                }
                $schema = $decoded;
            }

            $json = wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($json) {
                // JSON-LD must remain valid JSON — do not HTML-escape the payload.
                echo "\n<script type=\"application/ld+json\">\n" . $json . "\n</script>\n";
            }
        }
    }

    public function inject_json_ld_footer(): void {
        // Reserved for async-loaded schema.
    }

    private function register_llms_txt_endpoint(): void {
        add_rewrite_rule('^llms\.txt$', 'index.php?goals_ac_llms_txt=1', 'top');

        add_filter('query_vars', function ($vars) {
            $vars[] = 'goals_ac_llms_txt';
            return $vars;
        });

        add_action('template_redirect', function () {
            if (get_query_var('goals_ac_llms_txt')) {
                $content = get_option(self::LLMSTXT_OPTION, '');
                if (empty($content)) {
                    $content = "# llms.txt\n# This site uses goals.ac for AI-optimized content.\n";
                }

                header('Content-Type: text/plain; charset=utf-8');
                header('X-Robots-Tag: noindex');
                echo esc_html($content);
                exit;
            }
        });
    }
}
