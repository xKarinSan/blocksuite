/**
 * Utilities for fetching video transcripts from various platforms
 */

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from Loom URL
 */
export function extractLoomVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // loom.com/share/VIDEO_ID
    if (urlObj.hostname.includes('loom.com')) {
      const match = urlObj.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse YouTube XML captions into plain text
 */
function parseYouTubeCaptions(xml: string): string {
  try {
    // Remove XML tags and decode HTML entities
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const textNodes = doc.querySelectorAll('text');

    const lines: string[] = [];
    textNodes.forEach(node => {
      const text = node.textContent?.trim();
      if (text) {
        lines.push(text);
      }
    });

    return lines.join(' ');
  } catch {
    // Fallback: simple regex-based parsing
    return xml
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Fetch YouTube video transcript/captions
 */
export async function fetchYouTubeTranscript(
  videoId: string
): Promise<string | null> {
  try {
    // Try multiple caption languages
    const languages = ['en', 'en-US', 'en-GB'];

    for (const lang of languages) {
      try {
        const response = await fetch(
          `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`
        );

        if (response.ok) {
          const xml = await response.text();
          const transcript = parseYouTubeCaptions(xml);

          if (transcript && transcript.length > 100) {
            return transcript;
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch Loom video transcript
 * Note: Loom doesn't provide a public transcript API
 * This would require authentication or using Loom's SDK
 */
export async function fetchLoomTranscript(
  _videoId: string
): Promise<string | null> {
  // Loom transcripts require authentication
  // For now, return null and rely on title/description
  console.warn(
    'Loom transcript fetching requires authentication. Using metadata only.'
  );
  return null;
}

/**
 * Fetch transcript for any supported video platform
 */
export async function fetchVideoTranscript(
  url: string
): Promise<{ transcript: string | null; source: 'youtube' | 'loom' | null }> {
  // Try YouTube
  const youtubeId = extractYouTubeVideoId(url);
  if (youtubeId) {
    const transcript = await fetchYouTubeTranscript(youtubeId);
    return { transcript, source: 'youtube' };
  }

  // Try Loom
  const loomId = extractLoomVideoId(url);
  if (loomId) {
    const transcript = await fetchLoomTranscript(loomId);
    return { transcript, source: 'loom' };
  }

  return { transcript: null, source: null };
}
