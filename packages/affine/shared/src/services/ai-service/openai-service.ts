import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
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
   * Summarize a video using OpenAI
   * @param videoUrl - The URL of the video to summarize
   * @param metadata - Optional metadata (title, description) to provide context
   * @returns The generated summary
   */
  summarizeVideo(
    videoUrl: string,
    metadata?: { title?: string; description?: string }
  ): Promise<string>;
}

export const OpenAIProvider = createIdentifier<OpenAIService>('OpenAIService');

class OpenAIServiceImpl implements OpenAIService {
  private config: OpenAIConfig | null = null;

  configure(config: OpenAIConfig): void {
    this.config = {
      ...config,
      model: config.model || 'gpt-4-turbo',
      endpoint: config.endpoint || 'https://api.openai.com/v1/chat/completions',
    };
  }

  getConfig(): OpenAIConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  async summarizeVideo(
    videoUrl: string,
    metadata?: { title?: string; description?: string }
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'OpenAI service is not configured. Please set your API key first.'
      );
    }

    const prompt = this.buildPrompt(videoUrl, metadata);

    try {
      const response = await fetch(this.config!.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config!.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config!.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that creates concise, informative summaries of videos. Focus on key points, main topics, and important takeaways.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
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

  private buildPrompt(
    videoUrl: string,
    metadata?: { title?: string; description?: string }
  ): string {
    let prompt = `Please provide a concise summary of the following video:\n\nVideo URL: ${videoUrl}`;

    if (metadata?.title) {
      prompt += `\nTitle: ${metadata.title}`;
    }

    if (metadata?.description) {
      prompt += `\nDescription: ${metadata.description}`;
    }

    prompt +=
      '\n\nPlease summarize the main points, key topics, and important takeaways from this video in 2-4 paragraphs.';

    return prompt;
  }
}

export function OpenAIExtension(): ExtensionType {
  return {
    setup: di => {
      di.addImpl(OpenAIProvider, () => new OpenAIServiceImpl());
    },
  };
}
