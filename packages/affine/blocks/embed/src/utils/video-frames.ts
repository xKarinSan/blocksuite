/**
 * Utilities for extracting frames from videos for visual analysis
 */

export interface VideoFrame {
  dataUrl: string; // Base64 encoded image
  timestamp: number; // Time in seconds
}

/**
 * Extract frames from a YouTube video using thumbnail endpoints
 * YouTube provides thumbnails at various timestamps
 */
export async function extractYouTubeFrames(
  videoId: string,
  _count: number = 4
): Promise<VideoFrame[]> {
  const frames: VideoFrame[] = [];

  // YouTube thumbnail endpoints
  const thumbnailUrls = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Best quality
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, // High quality
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, // Medium quality
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`, // Standard quality
  ];

  // Try to fetch the best available thumbnail
  for (const url of thumbnailUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        frames.push({
          dataUrl,
          timestamp: 0, // Thumbnail is typically from the beginning
        });
        break;
      }
    } catch {
      continue;
    }
  }

  // Note: YouTube doesn't provide direct frame extraction at specific timestamps
  // For more frames, you'd need to:
  // 1. Use YouTube iframe API to seek and capture canvas
  // 2. Use a backend service to download and process video
  // 3. Use YouTube Data API v3 (requires API key)

  return frames;
}

/**
 * Extract frames from a Loom video
 * Loom provides thumbnail in video metadata
 */
export async function extractLoomFrames(
  _videoId: string,
  thumbnailUrl?: string
): Promise<VideoFrame[]> {
  const frames: VideoFrame[] = [];

  if (thumbnailUrl) {
    try {
      const response = await fetch(thumbnailUrl);
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        frames.push({
          dataUrl,
          timestamp: 0,
        });
      }
    } catch {
      // Ignore errors
    }
  }

  return frames;
}

/**
 * Convert Blob to Base64 data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract frames from video URL
 */
export async function extractVideoFrames(
  url: string,
  metadata?: { image?: string }
): Promise<VideoFrame[]> {
  // Check if it's a YouTube video
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (youtubeMatch) {
    return extractYouTubeFrames(youtubeMatch[1]);
  }

  // Check if it's a Loom video
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return extractLoomFrames(loomMatch[1], metadata?.image || undefined);
  }

  return [];
}
