import { WithDisposable } from '@blocksuite/affine/global/lit';
import { CloseIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

const OPENAI_CONFIG_STORAGE_KEY = 'blocksuite-openai-config';

/**
 * Utility functions for managing OpenAI config in localStorage
 */
export class OpenAIStorage {
  static getApiKey(): string | null {
    try {
      const stored = localStorage.getItem(OPENAI_CONFIG_STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        return config.apiKey || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  static setApiKey(apiKey: string): void {
    try {
      // Get existing config or create new one
      let config: any = {
        model: 'gpt-4o',
        visionModel: 'gpt-4o',
        endpoint: 'https://api.openai.com/v1/chat/completions',
      };

      const stored = localStorage.getItem(OPENAI_CONFIG_STORAGE_KEY);
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch {
          // Use default config
        }
      }

      config.apiKey = apiKey;
      localStorage.setItem(OPENAI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save API key to localStorage:', error);
    }
  }

  static clearApiKey(): void {
    try {
      localStorage.removeItem(OPENAI_CONFIG_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear API key from localStorage:', error);
    }
  }
}

@customElement('openai-settings-modal')
export class OpenAISettingsModal extends WithDisposable(LitElement) {
  static override styles = css`
    :host {
      display: block;
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: var(--affine-z-index-modal, 1001);
      animation: affine-modal-fade-in 0.2s ease;
    }

    @keyframes affine-modal-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background-color: var(--affine-background-primary-color);
      border-radius: 8px;
      box-shadow: var(--affine-overlay-shadow);
      width: 90%;
      max-width: 480px;
      padding: 24px;
      position: relative;
      animation: affine-modal-slide-in 0.2s ease;
    }

    @keyframes affine-modal-slide-in {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--affine-text-primary-color);
      margin: 0;
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      background: transparent;
      padding: 0;
    }

    .close-button:hover {
      background-color: var(--affine-hover-color);
    }

    .close-button svg {
      width: 16px;
      height: 16px;
      color: var(--affine-icon-color);
    }

    .modal-description {
      font-size: 14px;
      color: var(--affine-text-secondary-color);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .modal-description a {
      color: #1e96eb;
      text-decoration: none;
    }

    .modal-description a:hover {
      text-decoration: underline;
    }

    .input-group {
      margin-bottom: 16px;
    }

    .input-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--affine-text-primary-color);
      margin-bottom: 8px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      gap: 8px;
    }

    .input-field {
      flex: 1;
      padding: 8px 40px 8px 12px;
      border: 1px solid var(--affine-border-color);
      border-radius: 4px;
      font-size: 14px;
      font-family: var(--affine-font-family);
      color: var(--affine-text-primary-color);
      background-color: var(--affine-background-primary-color);
    }

    .toggle-password-button {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      background: transparent;
      padding: 0;
      color: var(--affine-icon-color);
      z-index: 1;
    }

    .toggle-password-button:hover {
      background-color: var(--affine-hover-color);
    }

    .toggle-password-button svg {
      width: 16px;
      height: 16px;
    }

    .input-field:focus {
      outline: none;
      border-color: #1e96eb;
    }

    .input-field::placeholder {
      color: var(--affine-text-disable-color);
    }

    .button-group {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .button {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      font-family: var(--affine-font-family);
      transition: background-color 0.2s;
    }

    .button-secondary {
      background-color: var(--affine-background-secondary-color);
      color: var(--affine-text-primary-color);
    }

    .button-secondary:hover {
      background-color: var(--affine-hover-color);
    }

    .button-primary {
      background-color: #1e96eb;
      color: white;
    }

    .button-primary:hover {
      background-color: #1a7dc4;
    }

    .button-primary:disabled {
      background-color: var(--affine-background-secondary-color);
      color: var(--affine-text-disable-color);
      cursor: not-allowed;
    }

    .success-message {
      font-size: 14px;
      color: #10b981;
      margin-top: 8px;
    }

    .current-key-info {
      font-size: 12px;
      color: var(--affine-text-secondary-color);
      margin-top: 4px;
    }
  `;

  @state()
  private accessor _apiKey = '';

  @state()
  private accessor _showSuccess = false;

  @state()
  private accessor _showPassword = false;

  @property({ attribute: false })
  accessor onClose!: () => void;

  override connectedCallback() {
    super.connectedCallback();

    // Load existing API key from localStorage
    const savedKey = OpenAIStorage.getApiKey();
    if (savedKey) {
      this._apiKey = savedKey;
    }

    // Close modal on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    this.disposables.add(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  }

  private _handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      this.onClose?.();
    }
  };

  private _handleSave = () => {
    if (!this._apiKey.trim()) {
      return;
    }

    OpenAIStorage.setApiKey(this._apiKey);
    this._showSuccess = true;

    // Hide success message after 2 seconds
    setTimeout(() => {
      this._showSuccess = false;
    }, 2000);
  };

  private _handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this._apiKey);
      this._showSuccess = true;
      setTimeout(() => {
        this._showSuccess = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  };

  private _handleClear = () => {
    this._apiKey = '';
    OpenAIStorage.clearApiKey();
  };

  private _togglePasswordVisibility = () => {
    this._showPassword = !this._showPassword;
  };

  protected override render() {
    const hasApiKey = !!this._apiKey.trim();
    const savedKey = OpenAIStorage.getApiKey();
    const isKeySaved = savedKey === this._apiKey && hasApiKey;

    return html`
      <div class="modal-backdrop" @click="${this._handleBackdropClick}">
        <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
          <div class="modal-header">
            <h2 class="modal-title">OpenAI Settings</h2>
            <button class="close-button" @click="${this.onClose}">
              ${CloseIcon()}
            </button>
          </div>

          <div class="modal-description">
            Configure your OpenAI API key for AI-powered features like video
            summarization. Your key is stored locally in your browser.
            <br />
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get your API key here
            </a>
          </div>

          <div class="input-group">
            <label class="input-label">API Key</label>
            <div class="input-wrapper">
              <input
                type="${this._showPassword ? 'text' : 'password'}"
                class="input-field"
                placeholder="sk-..."
                .value="${this._apiKey}"
                @input="${(e: InputEvent) => {
                  this._apiKey = (e.target as HTMLInputElement).value;
                }}"
              />
              <button
                class="toggle-password-button"
                @click="${this._togglePasswordVisibility}"
                type="button"
                aria-label="${this._showPassword ? 'Hide API key' : 'Show API key'}"
              >
                ${this._showPassword
                  ? html`
                      <!-- Eye slash icon (password visible, click to hide) -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path
                          d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"
                        />
                        <path
                          d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"
                        />
                        <path
                          d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"
                        />
                      </svg>
                    `
                  : html`
                      <!-- Eye icon (password hidden, click to show) -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path
                          d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"
                        />
                        <path
                          d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"
                        />
                      </svg>
                    `}
              </button>
            </div>
            ${isKeySaved
              ? html`<div class="current-key-info">
                  Key saved in localStorage
                </div>`
              : ''}
          </div>

          ${this._showSuccess
            ? html`<div class="success-message">
                ${isKeySaved ? 'Copied to clipboard!' : 'API key saved!'}
              </div>`
            : ''}

          <div class="button-group">
            ${hasApiKey
              ? html`
                  <button class="button button-secondary" @click="${this._handleClear}">
                    Clear
                  </button>
                  <button class="button button-secondary" @click="${this._handleCopy}">
                    Copy
                  </button>
                `
              : ''}
            <button
              class="button button-primary"
              @click="${this._handleSave}"
              ?disabled="${!hasApiKey}"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'openai-settings-modal': OpenAISettingsModal;
  }
}
