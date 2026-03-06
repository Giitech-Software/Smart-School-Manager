// functions/src/handlers/recognizeFace.ts

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import AWS from "aws-sdk";

admin.initializeApp();
const db = admin.firestore();

// Load AWS credentials from Firebase Secrets
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "us-east-1";
const collectionId = process.env.AWS_COLLECTION_ID || "school-attendance-staff";

// Initialize Rekognition client
const rekognition = new AWS.Rekognition({
  accessKeyId,
  secretAccessKey,
  region,
});

export const recognizeFaceHandler = async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 required" });
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Search face in AWS Rekognition collection
    const result = await rekognition
      .searchFacesByImage({
        CollectionId: collectionId,
        Image: { Bytes: imageBuffer },
        MaxFaces: 1,
        FaceMatchThreshold: 85, // configurable similarity threshold
      })
      .promise();

    if (!result.FaceMatches || result.FaceMatches.length === 0) {
      return res.json({ matched: false, similarity: 0 });
    }

    const match = result.FaceMatches[0];
    const staffId = match.Face?.ExternalImageId;
    const similarity = match.Similarity || 0;

    // Auto-mark attendance if needed
    if (staffId) {
      const attendanceRef = db
        .collection("staff")
        .doc(staffId)
        .collection("attendance")
        .doc(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

      await attendanceRef.set(
        { checkedInAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    return res.json({ matched: true, staffId, similarity });
  } catch (error: any) {
    console.error("recognizeFace error:", error);
    return res.status(500).json({ error: error.message });
  }
};