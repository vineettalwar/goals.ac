<?php

declare(strict_types=1);

namespace Drupal\block_content\Entity;

use Drupal\Core\Entity\ContentEntityInterface;

class BlockContent implements ContentEntityInterface
{
    /**
     * @param array<string, mixed> $values
     */
    public static function create(array $values = []): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function uuid(): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function id()
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function bundle(): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function hasField(string $field_name): bool
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function get(string $field_name)
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function set(string $field_name, mixed $value): static
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function save(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function getRevisionId(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function getTitle(): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function isPublished(): bool
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function getCreatedTime(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function getChangedTime(): int
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function toUrl(string $rel = 'canonical', array $options = []): \Drupal\Core\Entity\Url
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function language(): \Drupal\Core\Entity\LanguageInterface
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
