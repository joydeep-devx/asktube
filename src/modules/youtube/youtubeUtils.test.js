import test from "node:test";
import assert from "node:assert/strict";

import {
  extractYoutubeVideoId,
  isValidYoutubeUrl,
} from "./youtubeUtil.js";

test("extracts ID from standard YouTube URL", () => {
  assert.equal(
    extractYoutubeVideoId(
      "https://www.youtube.com/watch?v=abc123XYZ89"
    ),
    "abc123XYZ89"
  );
});

test("extracts ID from short URL", () => {
  assert.equal(
    extractYoutubeVideoId("https://youtu.be/abc123XYZ89"),
    "abc123XYZ89"
  );
});

test("extracts ID from Shorts URL", () => {
  assert.equal(
    extractYoutubeVideoId("https://www.youtube.com/shorts/abc123XYZ89"),
    "abc123XYZ89"
  );
});

test("extracts ID from embed URL", () => {
  assert.equal(
    extractYoutubeVideoId("https://www.youtube.com/embed/abc123XYZ89"),
    "abc123XYZ89"
  );
});

test("returns null for invalid URLs", () => {
  assert.equal(extractYoutubeVideoId("not-a-url"), null);
  assert.equal(extractYoutubeVideoId("https://example.com"), null);
  assert.equal(extractYoutubeVideoId("https://youtube.com/watch?v=invalid"), null);
});

test("validates YouTube URLs", () => {
  assert.equal(isValidYoutubeUrl("https://youtu.be/abc123XYZ89"), true);
  assert.equal(isValidYoutubeUrl("https://example.com"), false);
});