import { fetchTranscript } from "youtube-transcript-plus";
import { extractYoutubeVideoId } from "./youtubeUtil.js";

export const getYoutubeTranscript = async (url, { lang } = {}) => {
  // 1. Extract video ID
  const videoId = extractYoutubeVideoId(url);

  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // 2. Configure transcript extraction
  const options = {
    videoDetails: true,
    retries: 2,
    retryDelay: 1000,
  };

  if (lang) {
    options.lang = lang;
  }

  // 3. Fetch transcript
  const result = await fetchTranscript(videoId, options);

  // 4. Normalize transcript segments
  const segments = result.segments
    .map((segment) => ({
      text: segment.text.trim(),
      start: segment.offset,
      duration: segment.duration,
      end: segment.offset + segment.duration,
    }))
    .filter((segment) => segment.text.length > 0);

  if (segments.length === 0) {
    throw new Error("No transcript segments available");
  }

  // 5. Return structured transcript
  return {
    videoId,
    title: result.videoDetails?.title ?? null,
    author: result.videoDetails?.author ?? null,
    duration: Number(result.videoDetails?.lengthSeconds ?? 0),
    language: result.segments[0]?.lang ?? lang ?? null,
    segments,
    text: segments.map((segment) => segment.text).join(" "),
  };
};
