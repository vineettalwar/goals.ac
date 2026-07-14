<?php

declare(strict_types=1);

namespace Drupal\Core\Entity\Query;

interface QueryInterface
{
    public function accessCheck(bool $access_check): static;

    public function condition(string $field, mixed $value, ?string $operator = null): static;

    public function sort(string $field, string $direction = 'ASC'): static;

    public function range(int $start, ?int $length = null): static;

    /**
     * @return array<int|string>
     */
    public function execute(): array;
}
