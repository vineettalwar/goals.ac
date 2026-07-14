<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\Configuration;

class ExtensionConfiguration
{
    /**
     * @return array<string, mixed>
     */
    public function get(string $extensionKey): array
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
