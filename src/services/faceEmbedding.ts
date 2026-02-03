//mobile/src/services/faceEmbedding.ts
import type { Frame } from "react-native-vision-camera";

import { VisionCameraProxy } from "react-native-vision-camera";



/* =========================================================
   Types
========================================================= */

export type FaceEmbedding = number[];

export type FaceEmbeddingResult = {
  embedding: FaceEmbedding;
  confidence?: number;
};

/* =========================================================
   Native bridge (from STEP 4) deleted
========================================================= */


/* =========================================================
   Embedding extraction (WORKLET)
========================================================= */

const plugin = VisionCameraProxy.initFrameProcessorPlugin(
  "getFaceEmbedding",
  {}
);

export function extractFaceEmbedding(frame: Frame) {
  "worklet";
  return plugin?.call(frame) ?? null;
}
/* =========================================================
   STEP 5 — Matching Logic (JS SAFE)
========================================================= */

/**
 * Cosine similarity between two face embeddings
 * Range: -1 → 1 (we expect 0.7+ for real matches)
 */
export function compareEmbeddings(
  a: FaceEmbedding,
  b: FaceEmbedding
): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Threshold helper
 * Default: 0.82 (MLKit / Vision sweet spot)
 */
export function isFaceMatch(
  live: FaceEmbedding,
  stored: FaceEmbedding,
  threshold = 0.82
): boolean {
  return compareEmbeddings(live, stored) >= threshold;
}
