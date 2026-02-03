//mobile/src/types/types.ts
export type FaceResult = {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  smilingProbability?: number;
};
