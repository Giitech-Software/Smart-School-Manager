// mobile/src/types/vision-camera.d.ts
import type { Frame } from 'react-native-vision-camera';
import type { FaceResult } from '../vision/types';

declare global {
  var __detectFaces: (frame: Frame) => FaceResult[];
}

export {};
