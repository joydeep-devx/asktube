import { listLanguages } from "youtube-transcript-plus";
import { extractYoutubeVideoId } from "../src/modules/youtube/youtubeUtil.js";

const url = process.argv[2];

const videoId = extractYoutubeVideoId(url);

if (!videoId) {
  throw new Error("Invalid YouTube URL");
}

const languages = await listLanguages(videoId);

console.table(languages);