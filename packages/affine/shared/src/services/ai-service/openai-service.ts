import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  visionModel?: string;
  endpoint?: string;
}

export interface VideoFrame {
  dataUrl: string;
  timestamp: number;
}

export interface VideoSummaryOptions {
  title?: string;
  description?: string;
  transcript?: string;
  frames?: VideoFrame[];
}

export interface OpenAIService {
  /**
   * Configure the OpenAI API settings
   */
  configure(config: OpenAIConfig): void;

  /**
   * Get the current configuration
   */
  getConfig(): OpenAIConfig | null;

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean;

  /**
   * Clear the stored configuration
   */
  clearConfig(): void;

  /**
   * Summarize a video using OpenAI (multimodal: text + vision)
   * @param videoUrl - The URL of the video to summarize
   * @param options - Transcript, frames, and metadata
   * @returns The generated summary
   */
  summarizeVideo(
    videoUrl: string,
    options?: VideoSummaryOptions
  ): Promise<string>;
}

export const OpenAIProvider = createIdentifier<OpenAIService>('OpenAIService');

const STORAGE_KEY = 'blocksuite-openai-config';

class OpenAIServiceImpl implements OpenAIService {
  private config: OpenAIConfig | null = null;

  constructor() {
    // Load configuration from localStorage on initialization
    this.loadConfig();
  }

  configure(config: OpenAIConfig): void {
    this.config = {
      ...config,
      model: config.model || 'gpt-4o',
      visionModel: config.visionModel || 'gpt-4o',
      endpoint: config.endpoint || 'https://api.openai.com/v1/chat/completions',
    };

    // Save configuration to localStorage
    this.saveConfig();
  }

  private saveConfig(): void {
    if (typeof localStorage !== 'undefined' && this.config) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch (error) {
        console.warn('Failed to save OpenAI config to localStorage:', error);
      }
    }
  }

  private loadConfig(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.config = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to load OpenAI config from localStorage:', error);
      }
    }
  }

  getConfig(): OpenAIConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  clearConfig(): void {
    this.config = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear OpenAI config from localStorage:', error);
      }
    }
  }

  async summarizeVideo(
    videoUrl: string,
    options?: VideoSummaryOptions
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'OpenAI service is not configured. Please set your API key first.'
      );
    }

    const hasFrames = options?.frames && options.frames.length > 0;
    const hasTranscript = options?.transcript && options.transcript.length > 100;

    // Use vision model if we have frames, otherwise use text model
    const model = hasFrames ? this.config!.visionModel : this.config!.model;

    try {
      const messages = this.buildMessages(videoUrl, options, hasFrames);

      const response = await fetch(this.config!.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config!.apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages,
          temperature: 0.7,
          max_tokens: hasTranscript ? 800 : 500,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API error: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content;

      if (!summary) {
        throw new Error('No summary generated from OpenAI');
      }

      return summary.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to summarize video: ${error.message}`);
      }
      throw new Error('Failed to summarize video: Unknown error');
    }
  }

  private buildMessages(
    _videoUrl: string,
    options?: VideoSummaryOptions,
    includeFrames: boolean = false
  ): Array<{ role: string; content: string | Array<unknown> }> {
    const hasTranscript = options?.transcript && options.transcript.length > 100;
    const hasFrames = includeFrames && options?.frames && options.frames.length > 0;

    const systemMessage = {
      role: 'system',
      content:
        'You are a helpful assistant that creates concise, informative summaries of videos. When provided with video frames and/or transcripts, analyze them carefully to identify key points, main topics, and important takeaways. When only metadata (title/description) is available, create a summary based on that information and acknowledge the limitations.',
    };

    // Build text prompt based on available data
    let textPrompt = '';

    if (hasTranscript || hasFrames) {
      textPrompt = 'Please provide a comprehensive summary of this video:\n\n';
    } else {
      textPrompt = 'Please create a summary based on the available video metadata:\n\n';
    }

    if (options?.title) {
      textPrompt += `Title: ${options.title}\n`;
    }

    if (options?.description) {
      textPrompt += `Description: ${options.description}\n`;
    }

    if (options?.transcript) {
      textPrompt += `\nVideo Transcript:\n${options.transcript}\n`;
    }

    if (hasTranscript || hasFrames) {
      textPrompt +=
        '\nPlease analyze the content and provide a 2-4 paragraph summary covering the main points, key topics, and important takeaways.';
    } else {
      textPrompt +=
        '\nNote: Full video transcript and frames are not available. Based on the title and description provided, create a helpful 2-3 paragraph summary covering what the video is likely about, key topics it may cover, and potential takeaways. Be clear that this summary is based on metadata only.';
    }

    console.log("includeFrames",includeFrames)
    console.log("options.frames",options)
    console.log("options.frames",options?.frames)
    // If we have frames, build multimodal content
    if (includeFrames && options?.frames && options.frames.length > 0) {
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: textPrompt },
      ];

      // Add frames
      for (const frame of options.frames) {
        content.push({
          type: 'image_url',
          image_url: {
            url: frame.dataUrl,
          },
        });
      }
      console.log("content",content)

      return [systemMessage, { role: 'user', content }];
    }

    // Text-only message
    return [systemMessage, { role: 'user', content: textPrompt }];
  }
}

export function OpenAIExtension(): ExtensionType {
  return {
    setup: di => {
      di.addImpl(OpenAIProvider, () => new OpenAIServiceImpl());
    },
  };
}
