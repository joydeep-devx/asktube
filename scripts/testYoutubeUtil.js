import { extractYoutubeVideoId, isValidYoutubeUrl, } from "../src/modules/youtube/youtubeUtil.js";

const testUrls = [
  "https://www.youtube.com/watch?v=abc123XYZ89",
  "https://youtu.be/abc123XYZ89",
  "https://youtu.be/abc123XYZ89?t=120",
  "https://www.youtube.com/embed/abc123XYZ89",
  "https://www.youtube.com/shorts/abc123XYZ89",
  "https://www.youtube.com/live/abc123XYZ89",
  "https://youtube.com/watch?v=abc123XYZ89&feature=share",
];

for (const url of testUrls) {
  console.log("URL:", url);
  console.log("Video ID:", extractYoutubeVideoId(url));
  console.log("Valid:", isValidYoutubeUrl(url));
  console.log("-------------------------");
}

const invalidUrls = [
  "https://example.com",
  "not-a-url",
  "https://www.youtube.com/watch?v=invalid",
  "https://www.youtube.com/watch",
  "",
];

for (const url of invalidUrls) {
  console.log("Invalid URL:", url);
  console.log("Video ID:", extractYoutubeVideoId(url));
  console.log("Valid:", isValidYoutubeUrl(url));
  console.log("-------------------------");
}
