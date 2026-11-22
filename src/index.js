import "dotenv/config";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { getYoutubeTranscript } from "./modules/youtube/youtubetranscript.js";
import { splitTranscript } from "./rag/splitters/transcriptSplitter.js";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createTranscriptChain } from "./rag/chains/transcriptChain.js";
import { ChatGoogle } from "@langchain/google";

const URL1 = "https://www.youtube.com/shorts/uofOkFkZTnY";
const URL2 = "https://youtu.be/8ETRd0mgWAI";

// The retriever uses the same embedding model for transcript chunks and questions.
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001"
});

// The chat model answers using the excerpts supplied by the chain.
const model = new ChatGoogle({
  model: "gemini-3.5-flash-lite"
});

// Prepare this video once so later questions can reuse its index.
const transcript = await getYoutubeTranscript(URL2, { lang: "en" });

// Each chunk carries its original start and end timestamps for citations.
const transcriptChunks = splitTranscript(transcript);

// Embed the chunks and keep them searchable for the lifetime of this process.
const vectorStore = new MemoryVectorStore(embeddingModel);
await vectorStore.addDocuments(transcriptChunks);

const ques1 = "How does Cloudflare's security audit skill verify its findings?"
const ques2 = "What does serial killers think ?"

const retriever = vectorStore.asRetriever({ k: 5 });
const chain = createTranscriptChain(retriever, model);

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
