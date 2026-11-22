import "dotenv/config";
import { createVideoChain } from "./rag/videoChain.js";
const URL1 = "https://www.youtube.com/shorts/uofOkFkZTnY";
const URL2 = "https://youtu.be/8ETRd0mgWAI";

const ques1 = "How does Cloudflare's security audit skill verify its findings?"
const ques2 = "What does serial killers think ?"

// Prepare the video once, then reuse the chain for questions.
const chain = await createVideoChain(URL2);

function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

// Citation labels refer to the excerpts retrieved for this question.
const { answer, citations } = await chain.invoke(ques2);
console.log(answer);
for (const { label, start, end } of citations) {
  console.log(`[${label}] ${formatTimestamp(start)}–${formatTimestamp(end)}`);
}
