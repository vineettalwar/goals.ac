<?php
/**
 * Shared contract types for goals.ac CMS plugins.
 *
 * Defines the canonical request/response shapes that every CMS plugin
 * must implement.
 *
 * @package goals-ac/shared-contract
 */

namespace GoalsAC\Shared;

defined('ABSPATH') || defined('JOOMLA') || defined('DRUPAL') || defined('TYPO3') || exit;

/**
 * Canonical content payload sent by the goals.ac SaaS platform.
 */
class Contract {

    public const VERSION = '0.2.0';

    /**
     * Standard capabilities returned by every plugin's health endpoint.
     */
    public static function defaultCapabilities(): array {
        return [
            'drafts'           => true,
            'scheduling'       => true,
            'updates'          => true,
            'categories'       => true,
            'tags'             => true,
            'featured_image'   => true,
            'schema_injection' => true,
        ];
    }

    /**
     * Standard health response.
     */
    public static function healthResponse(string $cmsVersion, array $extra = []): array {
        return array_merge([
            'version'      => self::VERSION,
            'cms_version'  => $cmsVersion,
            'capabilities' => self::defaultCapabilities(),
        ], $extra);
    }

    /**
     * Standard publish request body fields.
     */
    public static function expectedPublishFields(): array {
        return [
            'title',
            'content',
            'status',
            'slug',
            'categories',
            'tags',
            'featured_image_id',
            'meta',
            'update_id',
            'output_mode',
            'editor_mode',
            'elementor_data',
            'layout',
            'layout_data',
            'layout_storage_field',
            'content_elements',
            'replace_strategy',
            'sections',
            'metafield_namespace',
            'metafield_key',
            'template_suffix',
        ];
    }

    /**
     * Standard schema request body fields.
     */
    public static function expectedSchemaFields(): array {
        return ['json_ld', 'llms_txt'];
    }
}
