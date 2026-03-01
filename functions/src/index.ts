//mobile/functions/src/index.ts
//import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { compareFace } from "./rekognition";

admin.initializeApp();

/*export const testFunction = functions.https.onRequest((req, res) => {
  res.send("Functions working 🚀");
});
*/

export const testFaceCheckin = onRequest(async (req, res) => {
  try {
    const { sourceImageBase64, targetImageBase64 } = req.body;

    if (!sourceImageBase64 || !targetImageBase64) {
      res.status(400).send("Missing images");
      return;
    }

    const sourceBuffer = Buffer.from(sourceImageBase64, "base64");
    const targetBuffer = Buffer.from(targetImageBase64, "base64");

    const result = await compareFace(sourceBuffer, targetBuffer);

    res.json({
      similarity: result.FaceMatches?.[0]?.Similarity || 0,
      result,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
    return;
  }
});