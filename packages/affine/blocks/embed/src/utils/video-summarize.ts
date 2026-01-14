import { toast } from '@blocksuite/affine-components/toast';
import {
  NotificationProvider,
  OpenAIProvider,
  type ToolbarContext,
  type VideoSummaryOptions,
} from '@blocksuite/affine-shared/services';
import type { BlockModel } from '@blocksuite/store';
import { Text } from '@blocksuite/store';
import { html } from 'lit';

import { extractVideoFrames } from './video-frames.js';
import { fetchVideoTranscript } from './video-transcript.js';

/**
 * Shows a dialog to configure OpenAI API key
 */
async function configureOpenAI(ctx: ToolbarContext): Promise<boolean> {
  const notification = ctx.std.getOptional(NotificationProvider);
  if (!notification) {
    toast(ctx.host, 'Notification service not available');
    return false;
  }

  const apiKey = await notification.prompt({
    title: 'Configure OpenAI',
    message: html`<div style="margin-bottom: 8px;">
      Enter your OpenAI API key to use video summarization.
      <br />
      <a
        href="https://platform.openai.com/api-keys"
        target="_blank"
        style="color: #1e96eb;"
        >Get your API key here</a
      >
    </div>`,
    placeholder: 'sk-...',
    confirmText: 'Save',
    cancelText: 'Cancel',
  });

  if (!apiKey) {
    return false;
  }

  const openAI = ctx.std.getOptional(OpenAIProvider);
  if (!openAI) {
    toast(ctx.host, 'OpenAI service not available');
    return false;
  }

  openAI.configure({ apiKey });
  toast(ctx.host, 'OpenAI configured successfully');
  return true;
}

/**
 * Summarizes a video and inserts the summary below the video block
 */
export async function summarizeVideo(
  ctx: ToolbarContext,
  model: BlockModel & {
    props: {
      url?: string;
      title?: string | null;
      description?: string | null;
      image?: string | null;
    };
  }
): Promise<void> {
  const openAI = ctx.std.getOptional(OpenAIProvider);

  if (!openAI) {
    toast(ctx.host, 'OpenAI service not available');
    return;
  }

  // Check if configured, if not, prompt for configuration
  if (!openAI.isConfigured()) {
    const configured = await configureOpenAI(ctx);
    if (!configured) {
      return;
    }
  }

  const { url, title, description } = model.props;

  if (!url) {
    toast(ctx.host, 'No video URL found');
    return;
  }

  const notification = ctx.std.getOptional(NotificationProvider);

  // Show loading notification
  notification?.notify({
    title: 'Analyzing video...',
    message: 'Fetching transcript and frames...',
    accent: 'info',
  });

  try {
    // Step 1: Fetch transcript in parallel with frames
    const [transcriptResult, frames] = await Promise.all([
      fetchVideoTranscript(url),
      extractVideoFrames(url, { image: model.props.image || undefined }),
    ]);

    const hasTranscript = !!transcriptResult.transcript;
    const hasFrames = frames.length > 0;

    // Update notification based on what we found
    let progressMessage = 'Generating summary';
    if (hasTranscript && hasFrames) {
      progressMessage += ' from transcript and visual content...';
    } else if (hasTranscript) {
      progressMessage += ' from transcript...';
    } else if (hasFrames) {
      progressMessage += ' from visual content...';
    } else {
      progressMessage += ' from metadata...';
    }

    notification?.notify({
      title: 'Summarizing video...',
      message: progressMessage,
      accent: 'info',
    });

    // Step 2: Generate summary with all available data
    const options: VideoSummaryOptions = {
      title: title || undefined,
      description: description || undefined,
      transcript: transcriptResult.transcript || undefined,
      frames: frames.length > 0 ? frames : undefined,
    };

    const summary = await openAI.summarizeVideo(url, options);

    // Insert summary as a new paragraph block below the video
    const parent = model.parent;
    if (!parent) {
      toast(ctx.host, 'Cannot insert summary: parent block not found');
      return;
    }

    const index = parent.children.indexOf(model);

    // Insert summary block
    ctx.store.addBlock(
      'affine:paragraph',
      {
        text: new Text(summary),
      },
      parent,
      index + 1
    );

    notification?.notify({
      title: 'Video summarized!',
      message: 'Summary inserted below the video',
      accent: 'success',
      duration: 3000,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    notification?.notify({
      title: 'Failed to summarize video',
      message,
      accent: 'error',
      duration: 5000,
    });
  }
}
