<?php
/**
 * Idempotent request handling.
 *
 * Every publish job carries an idempotency key. If a request with the same
 * key was already processed, return the stored result instead of creating
 * a duplicate.
 *
 * Each CMS plugin provides a KeyStore implementation.
 *
 * @package goals-ac/shared-contract
 */

namespace GoalsAC\Shared;

defined('ABSPATH') || defined('JOOMLA') || defined('DRUPAL') || defined('TYPO3') || exit;

class Idempotency {

    public const KEY_HEADER  = 'X-Idempotency-Key';
    public const TTL_SECONDS = 86400; // 24-hour idempotency window

    /**
     * Check for an existing result and return it if found.
     *
     * @param string   $idempotencyKey The key from the request header.
     * @param KeyStore $store          CMS-specific key storage.
     * @return array|null The stored result, or null if not found/expired.
     */
    public static function check(string $idempotencyKey, KeyStore $store): ?array {
        if (empty($idempotencyKey)) {
            return null;
        }

        $hash   = md5($idempotencyKey);
        $stored = $store->get($hash);

        if ($stored && is_array($stored)) {
            $age = time() - ($stored['_timestamp'] ?? 0);
            if ($age < self::TTL_SECONDS) {
                unset($stored['_timestamp']);
                return $stored;
            }
            $store->delete($hash);
        }

        return null;
    }

    /**
     * Store a result for idempotent replay.
     *
     * @param string $idempotencyKey The key from the request header.
     * @param array  $result         The result to store.
     * @param KeyStore $store        CMS-specific key storage.
     */
    public static function store(string $idempotencyKey, array $result, KeyStore $store): void {
        if (empty($idempotencyKey)) {
            return;
        }

        $hash = md5($idempotencyKey);
        $result['_timestamp'] = time();
        $store->set($hash, $result);
    }
}
