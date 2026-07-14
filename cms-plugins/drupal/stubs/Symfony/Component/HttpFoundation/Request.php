<?php

declare(strict_types=1);

namespace Symfony\Component\HttpFoundation;

class HeaderBag
{
    public function get(string $key, ?string $default = null): ?string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class Request
{
    public HeaderBag $headers;

    public function getContent(): string|false
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

class JsonResponse extends Response
{
    /**
     * @param mixed $data
     * @param array<string, string> $headers
     */
    public function __construct(mixed $data = null, int $status = 200, array $headers = [])
    {
    }
}

class Response
{
    public const HTTP_OK = 200;
    public const HTTP_CREATED = 201;
    public const HTTP_BAD_REQUEST = 400;
    public const HTTP_UNAUTHORIZED = 401;
    public const HTTP_UNPROCESSABLE_ENTITY = 422;
    public const HTTP_INTERNAL_SERVER_ERROR = 500;
}
