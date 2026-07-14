<?php

declare(strict_types=1);

namespace Drupal\Core\File;

interface FileSystemInterface
{
    public const CREATE_DIRECTORY = 1;
    public const MODIFY_PERMISSIONS = 2;
    public const EXISTS_REPLACE = 3;

    public function prepareDirectory(string $directory, int $options = 0): bool;

    public function saveData(string $data, string $destination, int $flags = self::EXISTS_REPLACE): string|false;
}
