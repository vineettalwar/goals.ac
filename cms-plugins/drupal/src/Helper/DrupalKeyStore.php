<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Helper;

use Drupal\Core\Database\Connection;
use GoalsAC\Shared\KeyStore;

/**
 * Drupal implementation of KeyStore using a dedicated database table.
 *
 * Stores idempotency keys for the 24-hour replay window.
 * The 'goals_ac_idempotency_keys' table is created via hook_schema().
 */
class DrupalKeyStore implements KeyStore {

  /**
   * The database table name.
   */
  private const TABLE = 'goals_ac_idempotency_keys';

  /**
   * Constructs a DrupalKeyStore.
   */
  public function __construct(
    protected Connection $database,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function get(string $hash): ?array {
    $record = $this->database->select(self::TABLE, 'k')
      ->fields('k', ['data'])
      ->condition('k.idempotency_hash', $hash)
      ->range(0, 1)
      ->execute()
      ->fetchObject();

    if ($record === FALSE) {
      return NULL;
    }

    $data = json_decode($record->data, TRUE);
    return is_array($data) ? $data : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function set(string $hash, array $value): void {
    $this->database->merge(self::TABLE)
      ->keys(['idempotency_hash' => $hash])
      ->fields([
        'data' => json_encode($value),
        'created_at' => (int) \Drupal::time()->getRequestTime(),
      ])
      ->execute();
  }

  /**
   * {@inheritdoc}
   */
  public function delete(string $hash): void {
    $this->database->delete(self::TABLE)
      ->condition('idempotency_hash', $hash)
      ->execute();
  }

}
