<?php

declare(strict_types=1);

namespace GoalsAC\Drupal\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Admin form for goals.ac site key and connection settings.
 */
class SettingsForm extends ConfigFormBase {

  public function __construct(
    ConfigFactoryInterface $config_factory,
    protected EntityTypeManagerInterface $entityTypeManager,
  ) {
    parent::__construct($config_factory);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('config.factory'),
      $container->get('entity_type.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['goals_ac.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'goals_ac_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('goals_ac.settings');

    $form['connection'] = [
      '#type' => 'details',
      '#title' => $this->t('Connection Settings'),
      '#open' => TRUE,
    ];

    $form['connection']['site_key'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Site Key'),
      '#description' => $this->t('Shared HMAC secret. Generate with: <code>php -r "echo bin2hex(random_bytes(32));"</code>'),
      '#default_value' => $config->get('site_key'),
      '#required' => TRUE,
      '#maxlength' => 128,
      '#attributes' => [
        'autocomplete' => 'off',
      ],
    ];

    $form['connection']['regenerate_key'] = [
      '#type' => 'button',
      '#value' => $this->t('Generate New Key'),
      '#submit' => ['::regenerateKeySubmit'],
      '#ajax' => [
        'callback' => '::regenerateKeyCallback',
        'wrapper' => 'site-key-wrapper',
      ],
    ];

    $form['content'] = [
      '#type' => 'details',
      '#title' => $this->t('Content Settings'),
      '#open' => TRUE,
    ];

    // Get available content types.
    $content_types = $this->entityTypeManager
      ->getStorage('node_type')
      ->loadMultiple();

    $options = [];
    foreach ($content_types as $type) {
      $options[$type->id()] = $type->label();
    }

    $form['content']['target_content_type'] = [
      '#type' => 'select',
      '#title' => $this->t('Target Content Type'),
      '#description' => $this->t('Content type used when goals.ac publishes new content.'),
      '#default_value' => $config->get('target_content_type') ?? 'article',
      '#options' => $options,
    ];

    $form['content']['allowed_content_types'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Allowed Content Types (Site Graph Export)'),
      '#description' => $this->t('Select which content types are exported in the site graph.'),
      '#default_value' => $config->get('allowed_content_types') ?? ['article', 'page'],
      '#options' => $options,
    ];

    $form['injection'] = [
      '#type' => 'details',
      '#title' => $this->t('Schema Injection'),
      '#open' => TRUE,
    ];

    $form['injection']['schema_injection_enabled'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable schema injection'),
      '#description' => $this->t('Allow goals.ac to store and inject JSON-LD structured data.'),
      '#default_value' => $config->get('schema_injection_enabled') ?? TRUE,
    ];

    $form['injection']['llms_txt_injection_enabled'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable llms.txt injection'),
      '#description' => $this->t('Inject llms.txt content as a meta tag in page head.'),
      '#default_value' => $config->get('llms_txt_injection_enabled') ?? TRUE,
    ];

    $form['status'] = [
      '#type' => 'details',
      '#title' => $this->t('Current Status'),
      '#open' => FALSE,
    ];

    $key_prefix = $config->get('site_key')
      ? substr((string) $config->get('site_key'), 0, 8) . '...'
      : $this->t('Not set');

    $form['status']['current_key'] = [
      '#type' => 'item',
      '#title' => $this->t('Current Key Prefix'),
      '#markup' => $this->t('Current Key Prefix: @prefix', ['@prefix' => $key_prefix]),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state): void {
    $site_key = $form_state->getValue('site_key');
    if (strlen($site_key) < 16) {
      $form_state->setErrorByName('site_key', $this->t('Site key must be at least 16 characters.'));
    }

    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $config = $this->config('goals_ac.settings');

    $config->set('site_key', $form_state->getValue('site_key'));
    $config->set('target_content_type', $form_state->getValue('target_content_type'));
    $config->set('allowed_content_types', $form_state->getValue('allowed_content_types'));
    $config->set('schema_injection_enabled', (bool) $form_state->getValue('schema_injection_enabled'));
    $config->set('llms_txt_injection_enabled', (bool) $form_state->getValue('llms_txt_injection_enabled'));

    $config->save();

    $this->messenger()->addStatus($this->t('goals.ac settings have been saved.'));
  }

  /**
   * AJAX callback: regenerate the site key.
   */
  public function regenerateKeyCallback(array &$form, FormStateInterface $form_state): array {
    return $form['connection']['site_key'];
  }

  /**
   * Submit handler for the regenerate key button.
   */
  public function regenerateKeySubmit(array &$form, FormStateInterface $form_state): void {
    $new_key = bin2hex(random_bytes(32));
    $form_state->setValue('site_key', $new_key);
    $form_state->setRebuild(TRUE);
  }

}
