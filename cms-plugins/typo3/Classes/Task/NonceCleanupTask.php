<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Task;

use GoalsAc\Typo3\Helper\Typo3NonceStore;

/**
 * Scheduler task to purge expired HMAC nonces.
 */
class NonceCleanupTask
{
    public function execute(): bool
    {
        (new Typo3NonceStore())->cleanup();
        return true;
    }
}
