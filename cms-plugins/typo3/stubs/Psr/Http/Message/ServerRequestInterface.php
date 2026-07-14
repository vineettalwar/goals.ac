<?php

declare(strict_types=1);

namespace Psr\Http\Message;

interface ServerRequestInterface
{
    public function getBody(): StreamInterface;

    public function getUri(): UriInterface;

    public function getMethod(): string;

    public function getHeaderLine(string $name): string;

    /**
     * @return mixed
     */
    public function getAttribute(string $name);
}
