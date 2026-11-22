import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogle } from "@langchain/google";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { getYoutubeTranscript } from "../modules/youtube/youtubetranscript.js";
import { splitTranscript } from "./splitters/transcriptSplitter.js";
import { createTranscriptChain } from "./chains/transcriptChain.js";

export async function createVideoChain(url) {
  const transcript = await getYoutubeTranscript(url, { lang: "en" });
  const store = new MemoryVectorStore(new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
  }));
  await store.addDocuments(splitTranscript(transcript));
  const model = new ChatGoogle({ model: "gemini-3.5-flash-lite" });
  return createTranscriptChain(store.asRetriever({ k: 5 }), model);
}
