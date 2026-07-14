<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\DataHandling;

class DataHandler
{
    /** @var array<string, array<int|string, array<string, mixed>>> */
    public array $datamap = [];

    /** @var array<string, int> */
    public array $substNEWwithIDs = [];

    /**
     * @param array<string, mixed> $data
     * @param array<string, mixed> $cmd
     */
    public function start(array $data, array $cmd): void
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function process_datamap(): void
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
