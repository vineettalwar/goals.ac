<?php

declare(strict_types=1);

defined('TYPO3') or die();

$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\GoalsAc\Typo3\Task\NonceCleanupTask::class] = [
    'extension' => 'goals_ac',
    'title' => 'goals.ac: Cleanup expired HMAC nonces',
    'description' => 'Removes expired nonce records from tx_goalsac_nonces.',
];
