import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { transcriptPrompt } from "../prompts/transcriptPrompt.js";

function formatExcerpts(documents) {
  return documents
    .map(({ pageContent, metadata }, index) =>
      `[${index + 1}] (${metadata.start}s - ${metadata.end}s)\n${pageContent}`
    )
    .join("\n\n");
}

export function createTranscriptChain(retriever, model) {
  const answerChain = RunnableSequence.from([
    ({ question, documents }) => ({ question, context: formatExcerpts(documents) }),
    transcriptPrompt,
    model,
    new StringOutputParser(),
  ]);

  return RunnableSequence.from([
    {
      documents: retriever,
      question: new RunnablePassthrough(),
    },
    RunnablePassthrough.assign({ answer: answerChain }),
    ({ documents, answer }) => {
      const citations = [];
      const seen = new Set();
      for (const match of answer.matchAll(/\[([1-9]\d*)\]/g)) {
        const label = Number(match[1]);
        if (label > documents.length || seen.has(label)) continue;
        const { pageContent, metadata } = documents[label - 1];
        const { videoId, start, end } = metadata;
        citations.push({ label, videoId, start, end, excerpt: pageContent });
        seen.add(label);
      }
      return { answer, citations };
    },
  ]);
}
