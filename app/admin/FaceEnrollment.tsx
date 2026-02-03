// mobile/app/admin/FaceEnrollment.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  useCameraFormat,
  useCameraDevices,
  useFrameProcessor,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../app/firebase";
import { extractFaceEmbedding } from "../../src/services/faceEmbedding";

/* =========================================================
   Types (minimal, STEP-4 safe)
========================================================= */

type FaceEmbedding = number[];

/* =========================================================
   Screen
========================================================= */

export default function FaceEnrollmentScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();

  /* ---------------- State ---------------- */
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedEmbedding, setCapturedEmbedding] =
    useState<FaceEmbedding | null>(null);

const [nativeReady, setNativeReady] = useState(true);


const hasCapturedRef = useRef(false);


  const cameraRef = useRef<Camera>(null);
 const devices = useCameraDevices();
const device = devices.find((d) => d.position === "front");

// ✅ ADD THIS
const format = useCameraFormat(device, []);



const onFaceCaptured = (embedding: number[]) => {
  if (!embedding || embedding.length === 0) return;
  if (hasCapturedRef.current) return;

  hasCapturedRef.current = true;
  setFaceDetected(true);
  setCapturedEmbedding(embedding);
};



  /* ---------------- Guard ---------------- */
  useEffect(() => {
    if (!studentId) {
      Alert.alert("Invalid request", "Missing student ID.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [studentId, router]);

  /* ---------------- Camera Permission ---------------- */
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []); 


/* ---------------- Native Module Check ---------------- */
useEffect(() => {
  if (typeof global.__getFaceEmbedding !== "function") {
    console.warn("❌ Native face embedding module not available");
    setNativeReady(false);
  }
}, []);

  /* ---------------- Frame Processor ---------------- */
const frameProcessor = useFrameProcessor((frame) => {
  "worklet";

  const result = extractFaceEmbedding(frame);
  if (!result?.embedding) return;

  // 🚨 DO NOT loop endlessly
  runOnJS(console.log)("Captured face embedding:", result.embedding);
}, []);


  /* ---------------- Save Face ---------------- */
  const saveFace = async () => {
    if (!studentId || !capturedEmbedding) return;

    try {
      setIsSaving(true);

      const studentRef = doc(db, "students", studentId);
      await updateDoc(studentRef, {
        faceEmbedding: capturedEmbedding,
        faceEnrolledAt: new Date(),
      });

      Alert.alert("Success", "Face registered successfully ✅");
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save face data");
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------- Render Guards ---------------- */
  if (hasPermission === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-2">Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-600 font-semibold text-center">
          Camera permission is required
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-xl bg-red-600"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-2">Loading front camera…</Text>
      </View>
    );
  }
if (!nativeReady) {
  return (
    <View className="flex-1 items-center justify-center px-6 bg-black">
      <Text className="text-red-400 text-center font-semibold">
        Face recognition module not available.
      </Text>
      <Text className="text-slate-300 text-center text-sm mt-2">
        Please rebuild the app with the face module enabled.
      </Text>

      <Pressable
        onPress={() => router.back()}
        className="mt-6 px-6 py-3 rounded-xl bg-red-600"
      >
        <Text className="text-white font-semibold">Go Back</Text>
      </Pressable>
    </View>
  );
}

  /* ---------------- Camera Preview ---------------- */
  return (
   <View className="flex-1 bg-black">
 <Camera
  ref={cameraRef}
  style={{ flex: 1 }}
  device={device}
  isActive={!hasCapturedRef.current}
  format={format}
  frameProcessor={frameProcessor}
  {...({ frameProcessorFps: 5 } as any)} // ✅ ADD THIS
/>
{/* Face alignment guide */}
<View className="absolute inset-0 items-center justify-center pointer-events-none">
  <View className="w-64 h-80 border-2 border-white/60 rounded-2xl" />
</View>

<Text className="absolute top-16 w-full text-center text-white/80 text-sm">
  Center your face here
</Text>


  {/* ---------------- Real-time Face Indicator ---------------- */}
  <View
    className={`absolute top-4 right-4 w-16 h-16 rounded-full border-2 items-center justify-center ${
      faceDetected ? "border-green-400 bg-green-200/30" : "border-red-400 bg-red-200/30"
    }`}
  >
    <Text className="text-xs text-white">{faceDetected ? "Detected" : "…"}</Text>
  </View>

  {/* ---------------- Bottom Controls ---------------- */}
  <View className="absolute bottom-0 w-full p-4 bg-black/60 items-center">
    <Text
      className={`text-center font-semibold ${
        faceDetected ? "text-green-400" : "text-white"
      }`}
    >
      {faceDetected ? "Face detected ✓" : "Align face within the frame"}
    </Text>

    <Pressable
      onPress={saveFace}
      disabled={!faceDetected || isSaving || !hasCapturedRef.current}
      className={`mt-4 px-6 py-3 rounded-xl ${
        faceDetected ? "bg-blue-600" : "bg-gray-600"
      }`}
    >
      <Text className="text-white font-semibold">
        {isSaving ? "Saving..." : "Register Face"}
      </Text>
    </Pressable>

    <Pressable
      onPress={() => router.back()}
      className="mt-4 px-6 py-3 rounded-xl bg-red-600"
    >
      <Text className="text-white font-semibold">Cancel</Text>
    </Pressable>
  </View>
</View>

  );
}
