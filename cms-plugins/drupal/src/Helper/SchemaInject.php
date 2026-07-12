<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Helper;

use Drupal\Core\State\StateInterface;
use Drupal\Core\File\FileSystemInterface;

/**
 * Stores and serves JSON-LD structured data and llms.txt content.
 *
 * JSON-LD is stored in a file and injected into <script type="application/ld+json">.
 * llms.txt is stored in state and injected via a <meta> tag.
 */
class SchemaInject {

  /**
   * Constructs a SchemaInject.
   */
  public function __construct(
    protected StateInterface $state,
    protected FileSystemInterface $fileSystem,
  ) {}

  /**
   * Store JSON-LD and/or llms.txt.
   *
   * @param string|null $json_ld  JSON-LD string to store.
   * @param string|null $llms_txt llms.txt content to store.
   * @return array Result with storage details.
   */
  public function store(?string $json_ld, ?string $llms_txt): array {
    $result = [];

    if ($json_ld !== NULL) {
      // Validate JSON.
      $decoded = json_decode($json_ld, TRUE);
      if (json_last_error() !== JSON_ERROR_NONE) {
        throw new \InvalidArgumentException('json_ld must be valid JSON: ' . json_last_error_msg());
      }

      // Store as a file in the public filesystem.
      $directory = 'goals_ac';
      $this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS);

      $filename = 'schema-' . date('Y-m-d') . '.json';
      $filepath = $directory . '/' . $filename;

      $this->fileSystem->saveData($json_ld, $filepath, FileSystemInterface::EXISTS_REPLACE);

      // Also store in state for quick access.
      $this->state->set('goals_ac.json_ld', $json_ld);
      $this->state->set('goals_ac.json_ld_path', $filepath);

      $result['path'] = $filepath;
    }

    if ($llms_txt !== NULL) {
      $this->state->set('goals_ac.llms_txt', $llms_txt);

      // Also store as a file.
      $directory = 'goals_ac';
      $this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS);

      $filename = 'llms-' . date('Y-m-d') . '.txt';
      $filepath = $directory . '/' . $filename;

      $this->fileSystem->saveData($llms_txt, $filepath, FileSystemInterface::EXISTS_REPLACE);
      $this->state->set('goals_ac.llms_txt_path', $filepath);

      $result['llms_path'] = $filepath;
    }

    return $result;
  }

  /**
   * Retrieve the stored JSON-LD string.
   */
  public function getJsonLd(): ?string {
    return $this->state->get('goals_ac.json_ld');
  }

  /**
   * Retrieve the stored llms.txt content.
   */
  public function getLlmsTxt(): ?string {
    return $this->state->get('goals_ac.llms_txt');
  }

  /**
   * Clear all stored schema data.
   */
  public function clear(): void {
    $this->state->delete('goals_ac.json_ld');
    $this->state->delete('goals_ac.json_ld_path');
    $this->state->delete('goals_ac.llms_txt');
    $this->state->delete('goals_ac.llms_txt_path');
  }

}
