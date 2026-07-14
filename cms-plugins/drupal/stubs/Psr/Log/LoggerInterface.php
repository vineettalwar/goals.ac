<?php

declare(strict_types=1);

namespace Psr\Log;

interface LoggerInterface
{
    /**
     * @param array<string, mixed> $context
     */
    public function error(string $message, array $context = []): void;
}
