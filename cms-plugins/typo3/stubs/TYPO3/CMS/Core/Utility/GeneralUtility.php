<?php

declare(strict_types=1);

namespace TYPO3\CMS\Core\Utility;

class GeneralUtility
{
    /**
     * @template T of object
     * @param class-string<T> $className
     * @return T
     */
    public static function makeInstance(string $className): object
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}
