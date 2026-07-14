<?php

declare(strict_types=1);

namespace Drupal\Core\Entity;

use Drupal\Core\Entity\Query\QueryInterface;

interface EntityTypeManagerInterface
{
    public function getStorage(string $entity_type_id): EntityStorageInterface;
}

interface EntityStorageInterface
{
    /**
     * @param array<string, mixed> $values
     */
    public function create(array $values = []): ContentEntityInterface;

    /**
     * @param array<string, mixed> $values
     * @return array<int|string, ContentEntityInterface>
     */
    public function loadByProperties(array $values): array;

    /**
     * @param array<int|string> $ids
     * @return array<int|string, ContentEntityInterface>
     */
    public function loadMultiple(array $ids): array;

    /**
     * @param int|string|null $id
     */
    public function load($id): ?ContentEntityInterface;

    public function getQuery(): QueryInterface;
}

interface ContentEntityInterface
{
    public function uuid(): string;

    /**
     * @return int|string|null
     */
    public function id();

    public function bundle(): string;

    public function hasField(string $field_name): bool;

    /**
     * @return mixed
     */
    public function get(string $field_name);

    /**
     * @return $this
     */
    public function set(string $field_name, mixed $value): static;

    public function save(): int;

    public function getTitle(): string;

    public function isPublished(): bool;

    public function getCreatedTime(): int;

    public function getChangedTime(): int;

    /**
     * @param array<string, mixed> $options
     */
    public function toUrl(string $rel = 'canonical', array $options = []): Url;

    public function language(): LanguageInterface;
}

interface LanguageInterface
{
    public function getId(): string;
}

class Url
{
    /**
     * @param array<string, mixed> $options
     */
    public function toString(): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class FieldItemList
{
    public bool $isEmpty = false;

    /**
     * @var mixed
     */
    public $value;

    /**
     * @var mixed
     */
    public $summary;

    /**
     * @var mixed
     */
    public $format;

    /**
     * @var mixed
     */
    public $entity;

    /**
     * @var mixed
     */
    public $alt;
}

class ConfigEntityBase implements ContentEntityInterface
{
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

    public function getTitle(): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function label(): string
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

    public function toUrl(string $rel = 'canonical', array $options = []): Url
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    public function language(): LanguageInterface
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
