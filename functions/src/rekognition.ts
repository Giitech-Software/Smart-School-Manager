// functions/src/rekognition.ts
import AWS from "aws-sdk";

AWS.config.update({
  region: "us-east-1", // replace with your region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const rekognition = new AWS.Rekognition();

export async function compareFace(
  sourceImageBuffer: Buffer,
  targetImageBuffer: Buffer
): Promise<AWS.Rekognition.CompareFacesResponse> {
  const params: AWS.Rekognition.CompareFacesRequest = {
    SourceImage: { Bytes: sourceImageBuffer },
    TargetImage: { Bytes: targetImageBuffer },
    SimilarityThreshold: 85,
  };

  return rekognition.compareFaces(params).promise();
}