<?php
/**
 * WordPress implementation of GoalsAC\Shared\KeyStore.
 *
 * Uses wp_options with autoload=no for idempotency key storage.
 *
 * @package goals-ac
 */

namespace Goals_AC;

defined( 'ABSPATH' ) || exit;

/**
 * Stores idempotent publish results in wp_options.
 */
class WP_Key_Store implements \GoalsAC\Shared\KeyStore {

	private const OPTION_PREFIX = 'goals_ac_idempotency_';

	/**
	 * Retrieve a stored idempotent result by hash.
	 *
	 * @param string $hash MD5-hashed idempotency key.
	 * @return array|null Stored result array, or null.
	 */
	public function get( string $hash ): ?array {
		$option = self::OPTION_PREFIX . $hash;
		$stored = \get_option( $option, null );

		return \is_array( $stored ) ? $stored : null;
	}

	/**
	 * Store an idempotent result by hash.
	 *
	 * @param string $hash  MD5-hashed idempotency key.
	 * @param array  $value Result array to store.
	 */
	public function set( string $hash, array $value ): void {
		$option = self::OPTION_PREFIX . $hash;
		\update_option( $option, $value, false );
	}

	/**
	 * Delete a stored idempotent result by hash.
	 *
	 * @param string $hash MD5-hashed idempotency key.
	 */
	public function delete( string $hash ): void {
		$option = self::OPTION_PREFIX . $hash;
		\delete_option( $option );
	}
}
