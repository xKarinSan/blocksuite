import { toast } from '@blocksuite/affine-components/toast';
import type { ToolbarContext } from '@blocksuite/affine-shared/services';
import { Text } from '@blocksuite/store';
import * as Y from 'yjs';

import type { EmbedYoutubeBlockComponent } from '../embed-youtube-block/embed-youtube-block.js';

/**
 * Formats seconds into a human-readable timestamp string.
 * @param totalSeconds - The time in seconds
 * @returns Formatted timestamp (e.g., "2:35" or "1:23:45")
 */
function formatTimestamp(totalSeconds: number): string {
  const currentTime = Math.floor(totalSeconds);
  const hours = Math.floor(currentTime / 3600);
  const minutes = Math.floor((currentTime % 3600) / 60);
  const seconds = currentTime % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Captures the current timestamp from a YouTube video iframe.
 * Uses the YouTube IFrame Player API to retrieve the current playback time.
 *
 * @param block - The YouTube block component
 * @param ctx - The toolbar context
 * @param model - The embed block model
 * @returns Promise that resolves when timestamp is captured
 */
async function captureYouTubeTimestamp(
  block: EmbedYoutubeBlockComponent,
  ctx: ToolbarContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
): Promise<void> {
  const currentTime = await block.getCurrentTime();

  if (currentTime === null) {
    toast(
      ctx.host,
      'Could not capture timestamp. Try playing the video first, then pause at the desired moment.'
    );
    throw new Error('Failed to get current time from YouTube player');
  }

  const timestamp = formatTimestamp(currentTime);
  toast(ctx.host, `Timestamp captured: ${timestamp}`);

  // Insert a new paragraph block with the timestamp below the video
  const { parent } = model;
  const index = parent?.children.indexOf(model);

  if (parent && index !== undefined) {
    const yText = new Y.Text();
    const timestampText = `${timestamp} :`;
    yText.insert(0, timestampText);
    const text = new Text(yText);

    ctx.store.addBlock(
      'affine:paragraph',
      { text },
      parent,
      index + 1
    );
  }
}

/**
 * Captures the current timestamp from a Loom video iframe.
 * Note: Loom doesn't provide a public API for timestamp retrieval yet.
 *
 * @param ctx - The toolbar context
 */
async function captureLoomTimestamp(ctx: ToolbarContext): Promise<void> {
  // Loom doesn't currently expose a public API for getting the current time
  // We could potentially use postMessage if Loom adds this feature in the future
  toast(
    ctx.host,
    'Timestamp capture is not yet supported for Loom videos. Loom does not provide a public API for this feature.'
  );
  throw new Error('Loom timestamp capture not supported');
}

/**
 * Main function to capture the current timestamp from a video embed.
 * Supports YouTube and Loom videos.
 *
 * @param ctx - The toolbar context
 * @param model - The embed block model
 * @param block - The embed block component
 */
export async function captureVideoTimestamp(
  ctx: ToolbarContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  block: EmbedYoutubeBlockComponent | unknown
): Promise<void> {
  try {
    if (model.flavour === 'affine:embed-youtube') {
      await captureYouTubeTimestamp(
        block as EmbedYoutubeBlockComponent,
        ctx,
        model
      );
    } else if (model.flavour === 'affine:embed-loom') {
      await captureLoomTimestamp(ctx);
    } else {
      toast(ctx.host, 'Timestamp capture not supported for this video type');
      throw new Error('Unsupported video type');
    }
  } catch (error) {
    console.error('Error capturing video timestamp:', error);
    throw error;
  }
}
