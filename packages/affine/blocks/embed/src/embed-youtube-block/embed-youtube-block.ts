import { LoadingIcon, OpenIcon } from '@blocksuite/affine-components/icons';
import type {
  EmbedYoutubeModel,
  EmbedYoutubeStyles,
} from '@blocksuite/affine-model';
import { ImageProxyService } from '@blocksuite/affine-shared/adapters';
import { ThemeProvider } from '@blocksuite/affine-shared/services';
import { BlockSelection } from '@blocksuite/std';
import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import { EmbedBlockComponent } from '../common/embed-block-element.js';
import { getEmbedCardIcons } from '../common/utils.js';
import { youtubeUrlRegex } from './embed-youtube-model.js';
import type { EmbedYoutubeBlockService } from './embed-youtube-service.js';
import { styles, YoutubeIcon } from './styles.js';
import { refreshEmbedYoutubeUrlData } from './utils.js';

export class EmbedYoutubeBlockComponent extends EmbedBlockComponent<
  EmbedYoutubeModel,
  EmbedYoutubeBlockService
> {
  static override styles = styles;

  override _cardStyle: (typeof EmbedYoutubeStyles)[number] = 'video';

  open = () => {
    let link = this.model.props.url;
    if (!link.match(/^[a-zA-Z]+:\/\//)) {
      link = 'https://' + link;
    }
    window.open(link, '_blank');
  };

  refreshData = () => {
    refreshEmbedYoutubeUrlData(this, this.fetchAbortController.signal).catch(
      console.error
    );
  };

  /**
   * Get the current playback time from the YouTube iframe
   * @returns Promise that resolves with the current time in seconds, or null if unavailable
   */
  async getCurrentTime(): Promise<number | null> {
    return new Promise(resolve => {
      const iframe = this.querySelector('iframe');
      if (!iframe?.contentWindow) {
        resolve(null);
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://www.youtube.com') return;

        try {
          const data =
            typeof event.data === 'string'
              ? JSON.parse(event.data)
              : event.data;

          if (
            data.event === 'infoDelivery' &&
            data.info?.currentTime !== undefined
          ) {
            window.removeEventListener('message', handleMessage);
            resolve(data.info.currentTime);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };

      window.addEventListener('message', handleMessage);

      // Send listening event first
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'listening',
            id: iframe.id || 'ytplayer',
          }),
          '*'
        );
      } catch (e) {
        console.error('Error sending listening event:', e);
      }

      // Then request current time
      setTimeout(() => {
        try {
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'getCurrentTime',
              args: '',
            }),
            '*'
          );
        } catch (e) {
          console.error('Error sending getCurrentTime command:', e);
        }
      }, 100);

      // Timeout after 2 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }, 2000);
    });
  }

  /**
   * Setup listener for YouTube player state changes (play, pause, etc.)
   */
  private _setupYouTubePlayerListener() {
    const handlePlayerStateChange = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data =
          typeof event.data === 'string'
            ? JSON.parse(event.data)
            : event.data;

        // YouTube player state: 2 = paused
        if (
          data.event === 'infoDelivery' &&
          data.info?.playerState === 2 &&
          this.model.props.autoCaptureOnPause
        ) {
          this._handlePauseEvent(data.info.currentTime);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    window.addEventListener('message', handlePlayerStateChange);
    this.disposables.add(() => {
      window.removeEventListener('message', handlePlayerStateChange);
    });

    // Enable player state change events
    const iframe = this.querySelector('iframe');
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'listening',
            id: iframe.id || 'ytplayer',
          }),
          '*'
        );
      } catch (e) {
        console.error('Error setting up YouTube player listener:', e);
      }
    }
  }

  /**
   * Handle pause event and capture timestamp if enabled
   */
  private async _handlePauseEvent(currentTime?: number) {
    if (!this.model.props.autoCaptureOnPause) return;

    // If currentTime is provided in the pause event, use it
    // Otherwise, try to get it via getCurrentTime
    const time = currentTime ?? (await this.getCurrentTime());

    if (time !== null && time > 0) {
      // Use the video timestamp utility to capture and insert
      const { captureVideoTimestamp } = await import(
        '../utils/video-timestamp.js'
      );

      // Create a minimal toolbar context
      const ctx = {
        host: this.host,
        std: this.std,
        store: this.store,
      };

      try {
        await captureVideoTimestamp(ctx, this.model, this);
      } catch (error) {
        console.error('Error auto-capturing timestamp on pause:', error);
      }
    }
  }

  private _handleDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    this.open();
  }

  private _selectBlock() {
    const selectionManager = this.host.selection;
    const blockSelection = selectionManager.create(BlockSelection, {
      blockId: this.blockId,
    });
    selectionManager.setGroup('note', [blockSelection]);
  }

  protected _handleClick(event: MouseEvent) {
    event.stopPropagation();
    this._selectBlock();
  }

  private _toggleAutoCaptureOnPause = (event: Event) => {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    this.store.updateBlock(this.model, {
      autoCaptureOnPause: checkbox.checked,
    });
  };

  override connectedCallback() {
    super.connectedCallback();
    this._cardStyle = this.model.props.style;

    if (!this.model.props.videoId) {
      this.store.withoutTransact(() => {
        const url = this.model.props.url;
        const urlMatch = url.match(youtubeUrlRegex);
        if (urlMatch) {
          const [, videoId] = urlMatch;
          this.store.updateBlock(this.model, {
            videoId,
          });
        }
      });
    }

    if (!this.model.props.description && !this.model.props.title) {
      this.store.withoutTransact(() => {
        this.refreshData();
      });
    }

    this.disposables.add(
      this.model.propsUpdated.subscribe(({ key }) => {
        this.requestUpdate();
        if (key === 'url') {
          this.refreshData();
        }
      })
    );

    matchMedia('print').addEventListener('change', () => {
      this._showImage = matchMedia('print').matches;
    });

    // Setup YouTube player listener for auto-capture on pause
    this._setupYouTubePlayerListener();
  }

  override renderBlock() {
    const {
      image,
      title = 'YouTube',
      description,
      creator,
      creatorImage,
      videoId,
    } = this.model.props;

    const loading = this.loading;
    const theme = this.std.get(ThemeProvider).theme;
    const imageProxyService = this.store.get(ImageProxyService);
    const { EmbedCardBannerIcon } = getEmbedCardIcons(theme);
    const titleIcon = loading ? LoadingIcon() : YoutubeIcon;
    const titleText = loading ? 'Loading...' : title;
    const descriptionText = loading ? null : description;
    const bannerImage =
      !loading && image
        ? html`<img src=${imageProxyService.buildUrl(image)} alt="banner" />`
        : EmbedCardBannerIcon;

    const creatorImageEl =
      !loading && creatorImage
        ? html`<img
            src=${imageProxyService.buildUrl(creatorImage)}
            alt="creator"
          />`
        : nothing;

    return this.renderEmbed(
      () => html`
        <div
          class=${classMap({
            'affine-embed-youtube-block': true,
            loading,
            selected: this.selected$.value,
          })}
          style=${styleMap({
            transformOrigin: '0 0',
          })}
          @click=${this._handleClick}
          @dblclick=${this._handleDoubleClick}
        >
          <div class="affine-embed-youtube-video">
            ${videoId
              ? html`
                  <div class="affine-embed-youtube-video-iframe-container">
                    <iframe
                      id="ytplayer"
                      type="text/html"
                      src=${`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                      loading="lazy"
                      credentialless
                    ></iframe>

                    <!-- overlay to prevent the iframe from capturing pointer events -->
                    <div
                      class=${classMap({
                        'affine-embed-youtube-video-iframe-overlay': true,
                        hide: !this.showOverlay$.value,
                      })}
                    ></div>
                    <img
                      class=${classMap({
                        'affine-embed-youtube-video-iframe-overlay': true,
                        'media-print': true,
                        hide: !this._showImage,
                      })}
                      src=${`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt="YouTube Video"
                      loading="lazy"
                    />
                  </div>
                `
              : bannerImage}
          </div>
          <div class="affine-embed-youtube-content">
            <div class="affine-embed-youtube-content-header">
              <div class="affine-embed-youtube-content-title-icon">
                ${titleIcon}
              </div>

              <div class="affine-embed-youtube-content-title-text">
                ${titleText}
              </div>

              <div class="affine-embed-youtube-content-creator-image">
                ${creatorImageEl}
              </div>

              <div class="affine-embed-youtube-content-creator-text">
                ${creator}
              </div>
            </div>

            ${loading
              ? html`<div
                  class="affine-embed-youtube-content-description"
                ></div>`
              : descriptionText
                ? html`<div class="affine-embed-youtube-content-description">
                    ${descriptionText}
                  </div>`
                : nothing}

            <div class="affine-embed-youtube-content-url" @click=${this.open}>
              <span>www.youtube.com</span>

              <div class="affine-embed-youtube-content-url-icon">
                ${OpenIcon}
              </div>
            </div>

            ${videoId
              ? html`
                  <div class="affine-embed-youtube-auto-capture-toggle">
                      <input
                        type="checkbox"
                        .checked=${this.model.props.autoCaptureOnPause}
                        @change=${this._toggleAutoCaptureOnPause}
                      />
                      Auto-capture timestamp on pause
                  </div>
                `
              : nothing}
          </div>
        </div>
      `
    );
  }

  @state()
  private accessor _showImage = false;

  @property({ attribute: false })
  accessor loading = false;
}
