<?php

declare(strict_types=1);

namespace Drupal\Core\Form;

use Drupal\Core\Config\ConfigFactoryInterface;

abstract class ConfigFormBase extends FormBase
{
    public function __construct(protected ConfigFactoryInterface $configFactory)
    {
    }

    /**
     * @return array<int, string>
     */
    abstract protected function getEditableConfigNames(): array;

    protected function config(string $name): \Drupal\Core\Config\ImmutableConfig
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

abstract class FormBase
{
    /**
     * @param array<string, mixed> $form
     * @return array<string, mixed>
     */
    public function buildForm(array $form, FormStateInterface $form_state): array
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    /**
     * @param array<string, mixed> $form
     */
    public function validateForm(array &$form, FormStateInterface $form_state): void
    {
    }

    /**
     * @param array<string, mixed> $form
     */
    public function submitForm(array &$form, FormStateInterface $form_state): void
    {
    }

    /**
     * @param array<string, string|int|float> $args
     */
    protected function t(string $string, array $args = []): string
    {
        throw new \BadMethodCallException('IDE stub only.');
    }

    protected function messenger(): MessengerInterface
    {
        throw new \BadMethodCallException('IDE stub only.');
    }
}

interface MessengerInterface
{
    /**
     * @param array<string, string|int|float> $args
     */
    public function addStatus(string $message, array $args = []): void;
}

interface FormStateInterface
{
    /**
     * @return mixed
     */
    public function getValue(string $key);

    public function setValue(string $key, mixed $value): void;

    public function setErrorByName(string $name, string $message): void;

    public function setRebuild(bool $rebuild = true): void;
}
