<?php

declare(strict_types=1);

namespace Drupal\file;

interface FileInterface
{
    public function getFileUri(): string;
}

class FileUrlGenerator
{
    public function generateAbsoluteString(string $uri): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
