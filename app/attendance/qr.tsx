// mobile/app/attendance/qr.tsx
import React, { useEffect, useState, useCallback, JSX } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, Camera } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter, Link, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
// use the unified register function (prevent duplicates)
import { registerAttendanceUnified } from "../../src/services/attendance";
import { getClassById } from "../../src/services/classes";
import { listStudents, getStudentById } from "../../src/services/students";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../app/firebase";
import { validateQrPayload } from "../../src/services/qr";

/** Helper: returns YYYY-MM-DD */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Parse JSON or string QR; returns studentId + classId if present */
function parseQRCodePayload(payload: string): {
  studentId?: string;
  classId?: string;
} {
  try {
    const maybeJson = JSON.parse(payload);
    if (typeof maybeJson === "object" && maybeJson !== null) {
      // Accept both signed style (userId + role + sig) and printable style (studentId)
      const studentId = typeof maybeJson.studentId === "string"
        ? maybeJson.studentId
        : typeof maybeJson.userId === "string"
        ? maybeJson.userId
        : undefined;
      const classId = typeof maybeJson.classId === "string" ? maybeJson.classId : undefined;
      return { studentId, classId };
    }
  } catch {}
  if (typeof payload === "string" && payload.trim().length > 0) {
    return { studentId: payload.trim() };
  }
  return {};
}

export default function QRScanner(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannedPayload, setScannedPayload] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [mode, setMode] = useState<"in" | "out">("in"); // default check-in

  // selectedClassId from URL param (if provided)
  const [selectedClassIdFromParam, setSelectedClassIdFromParam] = useState<string | null>(null);

  // friendly display name for the class (loaded from Firestore if possible)
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);

  // resolvedDocId: the actual classes collection document id (useful for listing students)
  const [selectedClassResolvedDocId, setSelectedClassResolvedDocId] = useState<string | null>(null);

  // student count for resolved class doc id
  const [selectedClassStudentCount, setSelectedClassStudentCount] = useState<number | null>(null);

  /** Read ?mode=in or ?mode=out and ?classId=... from route */
  useEffect(() => {
    const m = params?.mode;
    if (m === "out") setMode("out");
    else setMode("in");

    const cid = params?.classId;
    if (cid && typeof cid === "string" && cid.trim().length > 0) {
      setSelectedClassIdFromParam(cid);
    } else {
      setSelectedClassIdFromParam(null);
      setSelectedClassName(null);
      setSelectedClassResolvedDocId(null);
      setSelectedClassStudentCount(null);
    }
  }, [params]);

  /** If we have a classId param, try to resolve a friendly name and resolved doc id, and then fetch student count */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedClassIdFromParam) return;

      setSelectedClassName(null);
      setSelectedClassResolvedDocId(null);
      setSelectedClassStudentCount(null);

      try {
        const doc = await getClassById(selectedClassIdFromParam);
        if (mounted && doc) {
          setSelectedClassName(doc.name ?? selectedClassIdFromParam);
          setSelectedClassResolvedDocId(doc.id ?? null);
          try {
            const students = await listStudents(doc.id ?? "");
            if (mounted) setSelectedClassStudentCount(students.length);
          } catch {}
          return;
        }
      } catch {}

      try {
        const q = query(collection(db, "classes"), where("classId", "==", selectedClassIdFromParam));
        const snap = await getDocs(q);
        if (mounted && snap.docs.length > 0) {
          const d = snap.docs[0];
          const data = d.data() as any;
          setSelectedClassName(data.name ?? selectedClassIdFromParam);
          setSelectedClassResolvedDocId(d.id);
          try {
            const students = await listStudents(d.id);
            if (mounted) setSelectedClassStudentCount(students.length);
          } catch {}
          return;
        }
      } catch {}

      if (mounted) {
        setSelectedClassName(selectedClassIdFromParam);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedClassIdFromParam]);

  /** Request camera permission */
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  /** Handle scan */
  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      // prevent running multiple times while processing or already scanned
      if (scanned || processing) return;

      setScanned(true);
      setScannedPayload(data);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      console.log("[QR] scanned data:", data);

      // Try to parse JSON or fallback
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(data);
      } catch (e) {
        parsedJson = null;
      }

      // Detect signed payload (legacy/signed)
      const isSignedPayload =
        parsedJson &&
        typeof parsedJson === "object" &&
        typeof parsedJson.userId === "string" &&
        typeof parsedJson.role === "string" &&
        typeof parsedJson.ts !== "undefined" &&
        typeof parsedJson.sig === "string";

      let scannedStudentId: string | null = null; // canonical student doc id (or value to lookup)
      let classIdFromQR: string | null = null;

      if (isSignedPayload) {
        // validate signature (if validateQrPayload expects that signed shape)
        try {
          const valid = await validateQrPayload(parsedJson as any);
          if (!valid) {
            Alert.alert("Invalid QR", "Signature validation failed.");
            setScanned(false);
            setScannedPayload(null);
            return;
          }
        } catch (err: any) {
          console.error("validateQrPayload error:", err);
          Alert.alert("Invalid QR", "Signature validation error.");
          setScanned(false);
          setScannedPayload(null);
          return;
        }

        // for signed payloads we interpret the userId as the student doc id
        scannedStudentId = String(parsedJson.userId);
        classIdFromQR = parsedJson.classId ?? null;
      } else {
        // handle printable payloads or plain strings
        const fallback = parseQRCodePayload(data);
        scannedStudentId = fallback.studentId ?? null;
        classIdFromQR = fallback.classId ?? null;
      }

      if (!scannedStudentId) {
        Alert.alert("Invalid QR", "This QR code does not contain a student ID.");
        setScanned(false);
        setScannedPayload(null);
        return;
      }

      // Determine class id to use: prefer URL param, then QR payload
      const finalClassId = selectedClassIdFromParam ?? classIdFromQR ?? null;
      if (!finalClassId) {
        Alert.alert(
          "Class not specified",
          "No class selected. Provide a class in the QR payload or open this scanner from the Check-In screen with a selected class."
        );
        setScanned(false);
        setScannedPayload(null);
        return;
      }

      setProcessing(true);
      try {
        // Resolve scannedStudentId to an actual student doc if possible:
        let studentDoc: any = null;
        try {
          studentDoc = await getStudentById(scannedStudentId); // returns student or null
        } catch (e) {
          studentDoc = null;
        }

        // fallback: lookup by rollNo
        if (!studentDoc) {
          try {
            const q1 = query(collection(db, "students"), where("rollNo", "==", scannedStudentId));
            const snap1 = await getDocs(q1);
            if (snap1.docs.length > 0) {
              const d = snap1.docs[0];
              studentDoc = { id: d.id, ...(d.data() as any) };
            }
          } catch (e) {
            // nothing
          }
        }

        if (!studentDoc) {
          Alert.alert("Unknown student", "Scanned id does not match any student record.");
          setProcessing(false);
          setScanned(false);
          setScannedPayload(null);
          return;
        }

        // Register attendance using unified function (guards duplicates)
        try {
          await registerAttendanceUnified({
            studentId: String(studentDoc.id),
            classId: finalClassId,
            mode,
            biometric: false,
          });

          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}

          Alert.alert(
            "Success",
            `${studentDoc.name ?? studentDoc.displayName ?? String(studentDoc.id)} successfully ${mode === "in" ? "checked in" : "checked out"}.`
          );

          // keep scanned=true so camera ignores further scans until user taps "Scan Again"
        } catch (regErr: any) {
          const message = regErr?.message ?? "Failed to record attendance.";
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          Alert.alert("Attendance", message);
          setScanned(false);
          setScannedPayload(null);
        }
      } catch (err: any) {
        console.error("Attendance error:", err);
        Alert.alert("Error", err?.message ?? "Failed to record attendance.");
        setScanned(false);
        setScannedPayload(null);
      } finally {
        setProcessing(false);
      }
    },
    [scanned, processing, mode, selectedClassIdFromParam]
  );

  /** Permission states UI */
  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-neutral">Requesting camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-xl font-semibold mb-3">Camera permission required</Text>

        <Text className="text-neutral mb-6 text-center">
          This screen needs camera access to scan student QR codes. Enable it in
          Settings.
        </Text>

        <Pressable
          onPress={() =>
            Camera.requestCameraPermissionsAsync().then(({ status }) =>
              setHasPermission(status === "granted")
            )
          }
          className="bg-primary py-3 px-6 rounded-xl"
        >
          <Text className="text-white font-semibold text-center">
            Grant Permission
          </Text>
        </Pressable>

        <Link href="/attendance/checkin" asChild>
          <Pressable className="mt-4 border py-2 px-4 rounded-xl">
            <Text className="text-neutral text-center">Back</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    );
  }

  const displayClassInfo =
    selectedClassName
      ? `Class: ${selectedClassName}` +
        (typeof selectedClassStudentCount === "number" ? ` • ${selectedClassStudentCount} student${selectedClassStudentCount === 1 ? "" : "s"}` : "")
      : "";

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1">

        {/* CAMERA */}
        <CameraView
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          style={{ flex: 1 }}
        />

        {/* OVERLAY UI */}
        <View className="absolute inset-0">

          {/* TOP HEADER */}
          <View className="px-6 pt-10">
            <Text className="text-white text-xl font-bold text-center">
              Scan Student QR
            </Text>
            <Text className="text-white/70 text-sm text-center mt-1">
              Point your camera at the student's QR code
            </Text>

            {/* show selected class if provided */}
            {displayClassInfo ? (
              <Text className="text-white/80 text-sm text-center mt-3">{displayClassInfo}</Text>
            ) : null}

            {/* MODE TOGGLE */}
            <View className="mt-4 flex-row justify-center space-x-3">
              <Pressable
                onPress={() => setMode("in")}
                className={`px-4 py-2 rounded-full ${mode === "in" ? "bg-white" : "bg-white/15"}`}
              >
                <Text className={`font-semibold ${mode === "in" ? "text-primary" : "text-white"}`}>
                  Check-in
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode("out")}
                className={`px-4 py-2 rounded-full ${mode === "out" ? "bg-white" : "bg-white/15"}`}
              >
                <Text className={`font-semibold ${mode === "out" ? "text-primary" : "text-white"}`}>
                  Check-out
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SCAN FRAME */}
          <View className="flex-1 items-center justify-center">
            {/* Dark dim overlay */}
            <View className="absolute inset-0 bg-black/50" />

            <View
              style={{
                width: "70%",
                aspectRatio: 1,
                borderRadius: 14,
                overflow: "hidden",
              }}
              className="relative"
            >
              {/* Border */}
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.25)",
                  borderRadius: 14,
                }}
                className="absolute inset-0"
              />

              {/* Corner guides */}
              {["tl", "tr", "bl", "br"].map((c) => (
                <View
                  key={c}
                  style={{
                    position: "absolute",
                    width: 32,
                    height: 32,
                    borderColor: "white",
                    ...(c === "tl" && { left: -2, top: -2, borderLeftWidth: 3, borderTopWidth: 3 }),
                    ...(c === "tr" && { right: -2, top: -2, borderRightWidth: 3, borderTopWidth: 3 }),
                    ...(c === "bl" && { left: -2, bottom: -2, borderLeftWidth: 3, borderBottomWidth: 3 }),
                    ...(c === "br" && { right: -2, bottom: -2, borderRightWidth: 3, borderBottomWidth: 3 }),
                  }}
                />
              ))}
            </View>
          </View>

          {/* BOTTOM CARD */}
          <LinearGradient
            colors={["rgba(0,0,0,0.9)", "transparent"]}
            className="p-4"
          >

            {scannedPayload ? (
              <View className="bg-white/10 border border-white/10 rounded-xl p-4">
                <Text className="text-white/70 text-sm">Scanned:</Text>
                <Text className="text-white font-semibold mt-1">
                  {scannedPayload}
                </Text>

                <View className="flex-row mt-4 space-x-3">
                  <Pressable
                    onPress={() => {
                      setScanned(false);
                      setScannedPayload(null);
                    }}
                    className="flex-1 bg-primary py-3 rounded-xl"
                  >
                    <Text className="text-white font-semibold text-center">
                      Scan Again
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.replace("/attendance/checkin")}
                    className="flex-1 border border-white/20 py-3 rounded-xl"
                  >
                    <Text className="text-white font-semibold text-center">
                      Done
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row justify-between">
                <Pressable
                  onPress={() => router.back()}
                  className="py-3 px-4 rounded-xl bg-white/10"
                >
                  <Text className="text-white font-semibold">Back</Text>
                </Pressable>

                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Pressable
                    onPress={() => router.replace("/attendance/checkin")}
                    className="py-3 px-4 rounded-xl bg-white/10"
                  >
                    <Text className="text-white font-semibold">Cancel</Text>
                  </Pressable>
                )}
              </View>
            )}
          </LinearGradient> 
        </View>
      </View>
    </SafeAreaView>
  );
}
