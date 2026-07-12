<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Entity;

use Drupal\Core\Database\Connection;

/**
 * Database-backed nonce storage for HMAC replay protection.
 *
 * Uses a dedicated table 'goals_ac_nonces' created via hook_schema().
 * This is the Drupal equivalent of the WordPress custom DB table approach.
 */
class GoalsAcNonce {

  /**
   * The table name for nonce storage.
   */
  public const TABLE = 'goals_ac_nonces';

  /**
   * Constructs a GoalsAcNonce.
   */
  public function __construct(
    protected Connection $database,
  ) {}

  /**
   * Check if a nonce has been seen within the freshness window.
   */
  public function seen(string $nonce): bool {
    $record = $this->database->select(self::TABLE, 'n')
      ->fields('n', ['nonce'])
      ->condition('n.nonce', $nonce)
      ->condition('n.expires_at', $this->getCurrentTime(), '>')
      ->range(0, 1)
      ->execute()
      ->fetchObject();

    return $record !== FALSE;
  }

  /**
   * Store a nonce with its expiry time.
   */
  public function store(string $nonce, int $expiresAt): void {
    try {
      $this->database->insert(self::TABLE)
        ->fields([
          'nonce' => $nonce,
          'expires_at' => $expiresAt,
          'created_at' => $this->getCurrentTime(),
        ])
        ->execute();
    }
    catch (\Exception $e) {
      // Nonce may already exist from a concurrent request; ignore.
    }
  }

  /**
   * Delete expired nonces.
   */
  public function cleanup(): void {
    $this->database->delete(self::TABLE)
      ->condition('expires_at', $this->getCurrentTime(), '<=')
      ->execute();
  }

  /**
   * Get current Unix timestamp.
   */
  private function getCurrentTime(): int {
    return (int) \Drupal::time()->getRequestTime();
  }

}
