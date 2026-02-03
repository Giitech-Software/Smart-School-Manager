// src/vision/useFaceDetection.ts
export type FaceResult = {
  bounds: { x: number; y: number; width: number; height: number };
  smilingProbability?: number;
};

export function useFaceDetection() {
  return {
    detectFaces: (frame: any): FaceResult[] => {
      'worklet';
      return global.__detectFaces(frame);
    },
  };
}
