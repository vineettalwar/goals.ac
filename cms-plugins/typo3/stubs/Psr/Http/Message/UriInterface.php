<?php

declare(strict_types=1);

namespace Psr\Http\Message;

interface UriInterface
{
    public function getPath(): string;
}
