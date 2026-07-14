<?php

declare(strict_types=1);

namespace Drupal\taxonomy;

use Drupal\Core\Entity\ContentEntityInterface;

interface TermInterface extends ContentEntityInterface
{
    public function getName(): string;
}
