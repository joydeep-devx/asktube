import { getYoutubeTranscript } from "../src/modules/youtube/youtubetranscript.js";

const videoUrl = process.argv[2];

if (!videoUrl) {
  console.error(
    "Usage: node scripts/testTranscript.js <YOUTUBE_URL>"
  );
  process.exitCode = 1;
} else {
  try {
    const transcript = await getYoutubeTranscript(videoUrl, {
      lang: "hi",
    });

    console.log("\n========== VIDEO DETAILS ==========\n");

    console.log("Video ID:", transcript.videoId);
    console.log("Title:", transcript.title);
    console.log("Author:", transcript.author);
    console.log("Duration:", transcript.duration, "seconds");
    console.log("Language:", transcript.language);

    console.log("\n========== FIRST 5 SEGMENTS ==========\n");

    for (const segment of transcript.segments.slice(0, 5)) {
      console.log(`[${segment.start}s] ${segment.text}`);
    }

    console.log("\n========== SUMMARY ==========\n");

    console.log("Total segments:", transcript.segments.length);
    console.log("Transcript characters:", transcript.text.length);

  } catch (error) {
    console.error("Transcript extraction failed:", error.message);
    process.exitCode = 1;
  }
}
