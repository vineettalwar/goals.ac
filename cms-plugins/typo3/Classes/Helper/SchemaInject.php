<?php

declare(strict_types=1);

namespace GoalsAc\Typo3\Helper;

final class SchemaInject
{
    private const STORAGE_DIR = 'fileadmin/goals-ac';

    /**
     * @return array{path: string}
     */
    public function store(mixed $jsonLd, ?string $llmsTxt): array
    {
        $base = dirname(__DIR__, 3) . '/public/' . self::STORAGE_DIR;
        if (!is_dir($base) && !mkdir($base, 0755, true) && !is_dir($base)) {
            throw new \RuntimeException('Unable to create schema storage directory.');
        }

        if ($jsonLd !== null) {
            file_put_contents(
                $base . '/schema.json',
                json_encode($jsonLd, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
            );
        }

        if ($llmsTxt !== null) {
            file_put_contents($base . '/llms.txt', $llmsTxt);
        }

        return ['path' => '/' . self::STORAGE_DIR];
    }
}
