<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Helper;

use Drupal\Core\Database\Connection;
use GoalsAC\Shared\NonceStore;

/**
 * Drupal implementation of NonceStore using a dedicated database table.
 *
 * The 'goals_ac_nonces' table is created via hook_schema() in goals_ac.install.
 */
class DrupalNonceStore implements NonceStore {

  /**
   * The database table name.
   */
  private const TABLE = 'goals_ac_nonces';

  /**
   * Constructs a DrupalNonceStore.
   */
  public function __construct(
    protected Connection $database,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function seen(string $nonce): bool {
    $now = (int) \Drupal::time()->getRequestTime();

    $record = $this->database->select(self::TABLE, 'n')
      ->fields('n', ['nonce'])
      ->condition('n.nonce', $nonce)
      ->condition('n.expires_at', $now, '>')
      ->range(0, 1)
      ->execute()
      ->fetchObject();

    return $record !== FALSE;
  }

  /**
   * {@inheritdoc}
   */
  public function store(string $nonce, int $expiresAt): void {
    try {
      $this->database->insert(self::TABLE)
        ->fields([
          'nonce' => $nonce,
          'expires_at' => $expiresAt,
          'created_at' => (int) \Drupal::time()->getRequestTime(),
        ])
        ->execute();
    }
    catch (\Exception $e) {
      // Nonce may already exist from a concurrent request; safe to ignore.
    }
  }

  /**
   * {@inheritdoc}
   */
  public function cleanup(): void {
    $now = (int) \Drupal::time()->getRequestTime();

    $this->database->delete(self::TABLE)
      ->condition('expires_at', $now, '<=')
      ->execute();
  }

}
