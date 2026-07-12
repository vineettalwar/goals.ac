<?php
/**
 * HMAC request authentication with replay protection.
 *
 * Canonical request signing:
 *   HMAC(key, METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + SHA256(body))
 *
 * Each CMS plugin provides a NonceStore implementation; this class
 * orchestrates the verification flow.
 *
 * @package goals-ac/shared-contract
 */

namespace GoalsAC\Shared;

defined('ABSPATH') || defined('JOOMLA') || defined('DRUPAL') || exit;

class HMACAuth {

    public const TIMESTAMP_HEADER  = 'X-Goals-Timestamp';
    public const NONCE_HEADER      = 'X-Goals-Nonce';
    public const SIGNATURE_HEADER  = 'X-Goals-Signature';
    public const NONCE_EXPIRY      = 300; // 5 minutes

    /**
     * Verify an HMAC-signed request.
     *
     * @param array{
     *   method: string,
     *   path: string,
     *   timestamp: string,
     *   nonce: string,
     *   signature: string,
     *   body: string,
     * } $request     Normalized request data from the CMS adapter.
     * @param string    $siteKey     The shared secret (stored in CMS options/config).
     * @param NonceStore $nonceStore  CMS-specific nonce storage.
     * @return true|\WP_Error|object  True on success, error object on failure.
     */
    public static function verify(array $request, string $siteKey, NonceStore $nonceStore) {
        $timestamp = $request['timestamp'] ?? '';
        $nonce     = $request['nonce'] ?? '';
        $signature = $request['signature'] ?? '';
        $body      = $request['body'] ?? '';
        $method    = strtoupper($request['method'] ?? 'GET');
        $path      = $request['path'] ?? '/';

        if (empty($timestamp) || empty($nonce) || empty($signature)) {
            return self::error('missing_auth', 'Missing authentication headers.', 401);
        }

        // Freshness check: reject if timestamp is outside ±5 minutes.
        if (abs(time() - intval($timestamp)) > self::NONCE_EXPIRY) {
            return self::error('expired_request', 'Request timestamp expired. Ensure your clock is synchronized.', 401);
        }

        // Nonce replay protection.
        if ($nonceStore->seen($nonce)) {
            return self::error('nonce_reuse', 'Nonce has already been used. Possible replay attack.', 401);
        }

        if (empty($siteKey)) {
            return self::error('no_key', 'Site key not configured.', 500);
        }

        // Compute expected signature.
        $bodyHash = hash('sha256', $body);
        $canonical = $method . "\n" . $path . "\n" . $timestamp . "\n" . $nonce . "\n" . $bodyHash;
        $expected  = hash_hmac('sha256', $canonical, $siteKey);

        if (!hash_equals($expected, $signature)) {
            return self::error('invalid_signature', 'Invalid HMAC signature.', 401);
        }

        // Store nonce to prevent replay within the freshness window.
        $nonceStore->store($nonce, intval($timestamp) + self::NONCE_EXPIRY);

        return true;
    }

    /**
     * Compute HMAC signature for outbound requests (used by the SaaS-side connector).
     */
    public static function sign(string $method, string $path, int $timestamp, string $nonce, string $body, string $siteKey): string {
        $bodyHash  = hash('sha256', $body);
        $canonical = strtoupper($method) . "\n" . $path . "\n" . $timestamp . "\n" . $nonce . "\n" . $bodyHash;
        return hash_hmac('sha256', $canonical, $siteKey);
    }

    /**
     * Build the standard auth headers for an outbound request.
     */
    public static function headers(string $method, string $path, string $body, string $siteKey): array {
        $timestamp = (string) time();
        $nonce     = bin2hex(random_bytes(16));
        $signature = self::sign($method, $path, $timestamp, $nonce, $body, $siteKey);

        return [
            self::TIMESTAMP_HEADER => $timestamp,
            self::NONCE_HEADER     => $nonce,
            self::SIGNATURE_HEADER => $signature,
        ];
    }

    /**
     * Create a normalized error object. Each CMS adapter wraps this in its
     * native error type (WP_Error, Exception, etc.).
     */
    public static function error(string $code, string $message, int $status = 401): object {
        return (object) [
            'code'    => $code,
            'message' => $message,
            'status'  => $status,
        ];
    }
}
