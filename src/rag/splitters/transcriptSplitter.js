import { Document } from "@langchain/core/documents";


export function splitTranscript(transcript, { chunkSize = 1000, chunkOverlap = 200 } = {}) {
  if (!Array.isArray(transcript?.segments)) {
    throw new TypeError("Expected a transcript with a segments array.");
  }

  if (typeof transcript.videoId !== "string" || !transcript.videoId.trim()) {
    throw new TypeError("The transcript must have a videoId.");
  }

  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new RangeError("chunkSize must be a positive integer.");
  }

  if (!Number.isSafeInteger(chunkOverlap) || chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new RangeError("chunkOverlap must be an integer from 0 to chunkSize - 1.");
  }

  const segments = [];

  for (const segment of transcript.segments) {
    if (typeof segment?.text !== "string") {
      throw new TypeError("Each transcript segment must have a text string.");
    }

    const text = segment.text.trim();
    if (text.length === 0) continue;

    const { start, end } = segment;

    if (!Number.isFinite(start) || start < 0) {
      throw new RangeError("A segment must have a finite, non-negative start time.");
    }

    if (!Number.isFinite(end) || end < start) {
      throw new RangeError("A segment must have a finite end time at or after its start.");
    }

    const previous = segments.at(-1);
    if (previous && start < previous.start) {
      throw new RangeError("Transcript segments must be ordered by start time.");
    }

    segments.push({ text, start, end });
  }

  if (segments.length === 0) return [];

  // Find the index of the segment in the segments where chunk ends
  function findChunkEnd(firstIndex) {
    let nextIndex = firstIndex;
    let textLength = 0;

    while (nextIndex < segments.length && textLength < chunkSize) {
      const separatorLength = nextIndex === firstIndex ? 0 : 1;
      textLength += separatorLength + segments[nextIndex].text.length;
      nextIndex++;
    }

    return nextIndex;
  }

  // Create a chunk document
  function createChunkDocument(firstIndex, endIndex, chunkIndex) {
    const chunkSegments = segments.slice(firstIndex, endIndex);
    const pageContent = chunkSegments.map(segment => segment.text).join(" ");

    return new Document({
      pageContent,
      metadata: {
        videoId: transcript.videoId,
        title: transcript.title,
        author: transcript.author,
        duration: transcript.duration,
        start: chunkSegments[0].start,
        end: chunkSegments.at(-1).end,
      },
      id: `${transcript.videoId}:${transcript.language ?? "und"}:${chunkIndex}`,
    });
  }

  // Decides the overlap index in the segment array
  function findOverlapStart(firstIndex, endIndex) {
    let overlapStart = endIndex;
    let overlapLength = 0;

    while (overlapStart > firstIndex) {
      const candidate = segments[overlapStart - 1];
      const separatorLength = overlapStart === endIndex ? 0 : 1;
      const newLength = candidate.text.length + separatorLength + overlapLength;

      if (newLength > chunkOverlap) break;

      overlapStart--;
      overlapLength = newLength;
    }

    return overlapStart;
  }

  // Create the chunks
  const chunks = [];
  let firstIndex = 0;

  while (firstIndex < segments.length) {
    const endIndex = findChunkEnd(firstIndex);
    chunks.push(createChunkDocument(firstIndex, endIndex));

    if (endIndex === segments.length) break;

    firstIndex = findOverlapStart(firstIndex, endIndex, chunks.length);
  }

  return chunks;
}