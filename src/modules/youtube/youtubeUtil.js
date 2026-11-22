
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

export const extractYoutubeVideoId = (url) => {
  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Validate YouTube domain
    if (!YOUTUBE_HOSTS.has(hostname)) {
      return null;
    }

    const pathParts = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    let videoId = null;

    // Short URL: youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      videoId = pathParts[0];
    }

    // Standard URL: youtube.com/watch?v=VIDEO_ID
    else if (parsedUrl.pathname === "/watch") {
      videoId = parsedUrl.searchParams.get("v");
    }

    // Embed, Shorts and Live URLs
    else if (
      ["embed", "shorts", "live"].includes(pathParts[0])
    ) {
      videoId = pathParts[1];
    }

    // Validate extracted ID
    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
      return null;
    }

    return videoId;

  } catch {
    return null;
  }
};

export const isValidYoutubeUrl = (url) => {
  return extractYoutubeVideoId(url) !== null;
};
