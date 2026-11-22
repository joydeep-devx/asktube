import "dotenv/config";
import { createServer } from "node:http";
import { createVideoChain } from "./rag/videoChain.js";

// Share indexing work between questions, including simultaneous first requests.
const videos = new Map();
function getChain(videoId) {
  let chain = videos.get(videoId);
  if (!chain) {
    chain = createVideoChain(`https://www.youtube.com/watch?v=${videoId}`);
    chain.catch(() => {
      if (videos.get(videoId) === chain) videos.delete(videoId);
    });
  }
  videos.delete(videoId);
  videos.set(videoId, chain);
  if (videos.size > 8) videos.delete(videos.keys().next().value);
  return chain;
}

const server = createServer(async (req, res) => {
  function send(status, data) {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(data));
  }
  if (req.method !== "POST" || req.url !== "/ask") return send(404, { error: "Unknown endpoint." });
  if (req.headers.host !== "127.0.0.1:4317" ||
      (req.headers.origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin))) {
    return send(403, { error: "Unsupported origin." });
  }
  if (req.headers["content-type"] !== "application/json") return send(415, { error: "Expected JSON." });
  let input;
  try {
    const parts = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 16384) return send(413, { error: "Question too long." });
      parts.push(part);
    }
    input = JSON.parse(Buffer.concat(parts).toString());
  } catch {
    return send(400, { error: "Invalid request." });
  }
  if (typeof input?.videoId !== "string" || !/^[\w-]{11}$/.test(input.videoId) ||
      typeof input.question !== "string" || !input.question.trim() || input.question.length > 2000) {
    return send(400, { error: "Select a video and enter a question of up to 2000 characters." });
  }
  try {
    const chain = await getChain(input.videoId);
    send(200, await chain.invoke(input.question.trim()));
  } catch (error) {
    console.error("AskTube request failed:", error.name);
    send(502, { error: "Couldn’t answer for this video. Check English caption availability and your Gemini configuration, then try again." });
  }
});
server.listen(4317, "127.0.0.1", () => console.log("AskTube is listening on http://127.0.0.1:4317"));
