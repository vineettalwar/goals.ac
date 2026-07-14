<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Helper;

use Drupal\block_content\Entity\BlockContent;
use Drupal\Component\Uuid\UuidInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\layout_builder\Section;
use Drupal\layout_builder\SectionComponent;
use Drupal\node\NodeInterface;

/**
 * Applies goals.ac layout payloads to Drupal Layout Builder storage fields.
 */
final class LayoutBuilderPublish {

  /**
   * Constructs a LayoutBuilderPublish helper.
   */
  public function __construct(
    protected EntityTypeManagerInterface $entityTypeManager,
    protected UuidInterface $uuid,
  ) {}

  /**
   * Apply layout sections from a publish payload onto a node.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node receiving the layout override.
   * @param array<string, mixed> $layout
   *   Layout payload with a `sections` array.
   * @param string $storageField
   *   Machine name of the layout storage field.
   *
   * @throws \InvalidArgumentException
   */
  public function apply(NodeInterface $node, array $layout, string $storageField = 'layout_builder__layout'): void {
    if (!$node->hasField($storageField)) {
      throw new \InvalidArgumentException(sprintf(
        "Layout storage field '%s' does not exist on this content type.",
        $storageField,
      ));
    }

    $sections = [];
    foreach ($layout['sections'] ?? [] as $sectionData) {
      if (!is_array($sectionData)) {
        continue;
      }

      $layoutId = (string) ($sectionData['layout_id'] ?? 'layout_onecol');
      $layoutSettings = is_array($sectionData['layout_settings'] ?? NULL)
        ? $sectionData['layout_settings']
        : [];
      $section = new Section($layoutId, $layoutSettings);

      foreach ($sectionData['components'] ?? [] as $componentData) {
        if (!is_array($componentData)) {
          continue;
        }
        $section->appendComponent($this->buildComponent($componentData));
      }

      $sections[] = $section;
    }

    if ($sections === []) {
      throw new \InvalidArgumentException('layout.sections must contain at least one section.');
    }

    $node->set($storageField, $sections);
  }

  /**
   * Build a Layout Builder section component from payload data.
   *
   * @param array<string, mixed> $componentData
   */
  private function buildComponent(array $componentData): SectionComponent {
    $uuid = (string) ($componentData['uuid'] ?? $this->uuid->generate());
    $region = (string) ($componentData['region'] ?? 'content');
    $configuration = is_array($componentData['configuration'] ?? NULL)
      ? $componentData['configuration']
      : [];
    $type = (string) ($componentData['type'] ?? $configuration['id'] ?? '');

    if (str_starts_with($type, 'inline_block:')) {
      return $this->buildInlineBlockComponent($uuid, $region, $type, $configuration, $componentData);
    }

    $additional = is_array($componentData['additional'] ?? NULL) ? $componentData['additional'] : [];
    return new SectionComponent($uuid, $region, $configuration, $additional);
  }

  /**
   * Create an inline block component backed by a block_content entity.
   *
   * @param array<string, mixed> $configuration
   * @param array<string, mixed> $componentData
   */
  private function buildInlineBlockComponent(
    string $uuid,
    string $region,
    string $type,
    array $configuration,
    array $componentData,
  ): SectionComponent {
    $blockBundle = substr($type, strlen('inline_block:'));
    if ($blockBundle === '') {
      throw new \InvalidArgumentException('inline_block type requires a block bundle.');
    }

    $additional = is_array($componentData['additional'] ?? NULL) ? $componentData['additional'] : [];
    $body = is_array($additional['body'] ?? NULL) ? $additional['body'] : NULL;

    $block = BlockContent::create([
      'type' => $blockBundle,
      'info' => (string) ($configuration['label'] ?? 'Section'),
    ]);

    if ($body !== NULL && $block->hasField('body')) {
      $block->set('body', [
        'value' => (string) ($body['value'] ?? ''),
        'format' => (string) ($body['format'] ?? 'basic_html'),
      ]);
    }

    $block->save();

    $pluginConfiguration = array_merge([
      'id' => $type,
      'provider' => 'layout_builder',
      'view_mode' => 'full',
      'label_display' => FALSE,
    ], $configuration, [
      'block_uuid' => $block->uuid(),
      'block_revision_id' => $block->getRevisionId(),
    ]);

    return new SectionComponent($uuid, $region, $pluginConfiguration);
  }

}
