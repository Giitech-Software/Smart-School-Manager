// mobile/src/types/global.d.ts
import type { Frame } from "react-native-vision-camera";

declare global {
  var __getFaceEmbedding:
    | ((frame: Frame) => { embedding: number[]; confidence?: number } | null)
    | undefined;
}

export {};
