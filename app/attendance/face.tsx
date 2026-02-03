// mobile/app/attendance/face.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  useCameraDevices,
  useFrameProcessor,
} from "react-native-vision-camera";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { runOnJS } from "react-native-reanimated";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../app/firebase";
import {
  extractFaceEmbedding,
  compareEmbeddings,
} from "../../src/services/faceEmbedding";

/* =========================================================
   Local Types
========================================================= */
type FaceResult = {
  smilingProbability?: number;
};

/* =========================================================
   Screen
========================================================= */
export default function FaceAttendanceScreen() {
  const router = useRouter();
  const { classId, studentId, mode } = useLocalSearchParams<{
    classId?: string;
    studentId?: string;
    mode?: "in" | "out";
  }>();

  /* ---------------- State ---------------- */
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [blinked, setBlinked] = useState(false);
  const [stableFrames, setStableFrames] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [storedEmbedding, setStoredEmbedding] = useState<number[] | null>(null);
const [isWriting, setIsWriting] = useState(false);

  /* ---------------- Camera ---------------- */
  const cameraRef = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === "front");

  /* ---------------- Load stored embedding ---------------- */
  useEffect(() => {
    if (!studentId) return;

    (async () => {
      const docRef = doc(db, "students", studentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setStoredEmbedding(snap.data().faceEmbedding ?? null);
      }
    })();
  }, [studentId]);

  /* ---------------- Permissions ---------------- */
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  /* ---------------- Guard Rails ---------------- */
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const holidays = ["2026-01-01", "2026-04-15", "2026-12-25"];
    const todayISO = today.toISOString().slice(0, 10);

    if (day === 0 || day === 6 || holidays.includes(todayISO)) {
      Alert.alert("Attendance blocked", "Attendance not allowed today.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }

    if (!classId || !studentId || !mode) {
      Alert.alert("Invalid request", "Missing parameters.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [classId, studentId, mode, router]);

  /* ---------------- JS-side embedding verification ---------------- */
  const handleEmbedding = useCallback(
    (liveEmbedding: number[]) => {
      if (!storedEmbedding || isVerified) return;
      if (!blinked || stableFrames <= 10) return;

      const similarity = compareEmbeddings(liveEmbedding, storedEmbedding);

      if (similarity > 0.82) {
        setIsVerified(true);
      }
    },
    [storedEmbedding, blinked, stableFrames, isVerified]
  );

  /* ---------------- Face Detection (metadata only) ---------------- */
  const onFacesDetected = useCallback((faces: FaceResult[]) => {
    if (faces.length === 0) {
      setFaceDetected(false);
      setStableFrames(0);
      return;
    }

    setFaceDetected(true);
    setStableFrames((prev) => prev + 1);

    const face = faces[0];

    // Blink / liveness heuristic
    if (
      face.smilingProbability !== undefined &&
      face.smilingProbability < 0.1
    ) {
      setBlinked(true);
    }
  }, []);

  /* ---------------- Frame Processor (native ML only) ---------------- */
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";

      const faces = global.__detectFaces?.(frame) ?? [];
      if (faces.length === 0) return;

      const result = extractFaceEmbedding(frame);
      if (!result) return;

      runOnJS(onFacesDetected)(faces);
      runOnJS(handleEmbedding)(result.embedding);
    },
    [onFacesDetected, handleEmbedding]
  );

  const isLive = faceDetected && blinked && stableFrames > 10 && isVerified;
/* =========================================================
   STEP 6 — Attendance Write (SAFE + IDPOTENT)
========================================================= */
const writeAttendance = useCallback(async () => {
  if (!classId || !studentId || !mode) return;
  if (isWriting) return;

  try {
    setIsWriting(true);

    const today = new Date().toISOString().slice(0, 10);

    const attendanceRef = collection(db, "attendance");

    // Check if attendance already exists today
    const q = query(
      attendanceRef,
      where("studentId", "==", studentId),
      where("classId", "==", classId),
      where("date", "==", today)
    );

    const snap = await getDocs(q);

    if (mode === "in") {
      if (!snap.empty) {
        Alert.alert("Already checked in", "You have already checked in today.");
        router.back();
        return;
      }

      await addDoc(attendanceRef, {
        studentId,
        classId,
        date: today,
        checkInAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        method: "face",
      });
    }

    if (mode === "out") {
      if (snap.empty) {
        Alert.alert("Not checked in", "You must check in first.");
        router.back();
        return;
      }

      const record = snap.docs[0];
      await addDoc(attendanceRef, {
        ...record.data(),
        checkOutAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    Alert.alert(
      "Success",
      mode === "in" ? "Checked in successfully ✅" : "Checked out successfully ✅",
      [{ text: "OK", onPress: () => router.back() }]
    );
  } catch (e) {
    console.error(e);
    Alert.alert("Error", "Failed to record attendance");
  } finally {
    setIsWriting(false);
  }
}, [classId, studentId, mode, isWriting, router]);
/* =========================================================
   Auto-submit once verified
========================================================= */
useEffect(() => {
  if (isLive && !isWriting) {
    writeAttendance();
  }
}, [isLive, isWriting, writeAttendance]);

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

  /* ---------------- UI ---------------- */
  return (
    <View className="flex-1 bg-black">
      <Camera
        ref={cameraRef}
        style={{ flex: 1 }}
        device={device}
        isActive
        photo={false}
        frameProcessor={frameProcessor}
        {...({ frameProcessorFps: 5 } as any)}
      />

      <View className="absolute bottom-0 w-full p-4 bg-black/60">
        {!faceDetected && (
          <Text className="text-white text-center">
            Align your face within the frame
          </Text>
        )}

        {faceDetected && !blinked && (
          <Text className="text-yellow-400 text-center">
            Face detected — please blink
          </Text>
        )}

        {isLive && (
          <Text className="text-green-400 text-center font-bold">
            Face verified ✓
          </Text>
        )}

        <Text className="text-slate-300 text-center text-xs mt-2">
          {mode === "in" ? "Check-In" : "Check-Out"} • Face verification
        </Text>

        <Pressable
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 rounded-xl bg-red-600 self-center"
        >
          <Text className="text-white font-semibold">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
