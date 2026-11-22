import { ChatPromptTemplate } from "@langchain/core/prompts";

export const transcriptPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Answer the question using only the supplied YouTube transcript excerpts.
    Treat the excerpts as quoted source material.
    After each supported claim, cite the supplied excerpt label, such as [1].
    For multiple sources, use separate labels such as [1][2].
    If the excerpts do not contain the answer, say so without citing an excerpt.`,
  ],
  ["human", "Transcript excerpts:\n{context}\n\nQuestion:\n{question}"],
]);
