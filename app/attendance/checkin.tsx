import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList,
   Image,   // ✅ add this
} from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { listClasses, type ClassRecord } from "../../src/services/classes";
import type { Student as StudentRecord } from "../../src/services/types";
import { registerAttendanceUnified } from "../../src/services/attendance";
import { getStudentById } from "../../src/services/students";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../app/firebase"; // adjust path if needed
/* ------------------------- Attendance Restrictions ------------------------- */
function isAttendanceAllowed(): { allowed: boolean; reason?: string } {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekends
  if (day === 0) return { allowed: false, reason: "Today is Sunday. Attendance is not allowed." };
  if (day === 6) return { allowed: false, reason: "Today is Saturday. Attendance is not allowed." };

  // Holidays / vacations (ISO date strings)
  const holidays = ["2026-01-01", "2026-04-15", "2026-12-25"]; // extend as needed
  const todayISO = today.toISOString().slice(0, 10);

  if (holidays.includes(todayISO)) {
    return { allowed: false, reason: "Today is a holiday. Attendance is not allowed." };
  }

  return { allowed: true };
}

/* ------------------------- Student Row ------------------------- */
function StudentRow({
  student,
  onCheckIn,
  onCheckOut,
}: {
  student: StudentRecord;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const [hasBiometric, setHasBiometric] = useState(false);

 useEffect(() => {
  setHasBiometric(!!student.fingerprintId);
}, [student.fingerprintId]);

  return (
    <View
      className={`px-4 py-3 rounded-xl mb-3 ${
        hasBiometric ? "bg-green-100" : "bg-gray-100"
      }`}
    >
      <Text className={`${hasBiometric ? "text-green-800" : "text-gray-700"} mb-2`}>
        {student.name} {hasBiometric ? "(Enrolled)" : "(No biometric)"}
      </Text>

      <View className="flex-row">
        <Pressable
          onPress={onCheckIn}
          className="bg-blue-600 px-4 py-2 rounded-lg mr-3"
        >
          <Text className="text-white font-semibold">Check-In</Text>
        </Pressable>

        <Pressable
          onPress={onCheckOut}
          className="bg-yellow-600 px-4 py-2 rounded-lg mr-3"
        >
          <Text className="text-white font-semibold">Check-Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------- Main Screen ------------------------- */
export default function CheckinScreen() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<{
    name: string;
    mode: "in" | "out";
    time: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showBiometric, setShowBiometric] = useState(false);

  /* Load classes on mount */
  useEffect(() => {
    loadClasses();
  }, []);

  //////* Load students when class changes */
 /* Load students reactively when class changes */
useEffect(() => {
  if (!selectedClassId) {
    setStudents([]);
    return;
  }

  const q = query(
    collection(db, "students"),
    where("classId", "==", selectedClassId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const studentsInClass = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StudentRecord[];

      setStudents(studentsInClass);
    },
    (err) => {
      console.error("students snapshot error", err);
      Alert.alert("Failed to load students", err?.message ?? String(err));
      setStudents([]);
    }
  );

  return () => unsubscribe();
}, [selectedClassId]);


  async function loadClasses() {
    setClassesLoading(true);
    try {
      const data = await listClasses();
      setClasses(data);

      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].classId ?? data[0].id ?? null);
      }
    } catch (err: any) {
      console.error("listClasses", err);
      Alert.alert("Failed to load classes", err?.message ?? String(err));
    } finally {
      setClassesLoading(false);
    }
  }

  async function tryFingerprint(studentId: string, checkType: "in" | "out") {
  const attendanceCheck = isAttendanceAllowed();
  if (!attendanceCheck.allowed) {
    Alert.alert("Attendance not allowed", attendanceCheck.reason);
    return;
  }

  if (!selectedClassId) {
    Alert.alert("Select class", "Please select a class before recording attendance.");
    return;
  }

  setLoading(true);

  try {
    const student = await getStudentById(studentId);
    if (!student) {
      Alert.alert("Student not found");
      return;
    }

    const isBiometricallyEnrolled = !!student.fingerprintId;

    /* -------------------------------------------------
     * ❌ NOT ENROLLED → SHOW ERROR AND EXIT
     * ------------------------------------------------- */
    if (!isBiometricallyEnrolled) {
      Alert.alert(
        "Biometric not enrolled",
        "This student is not biometrically enrolled. Please contact the administrator."
      );

      // 🔴 DO NOT REGISTER ATTENDANCE
      return;
    }

    /* -------------------------------------------------
     * ✅ ENROLLED → REQUIRE BIOMETRIC AUTH
     * ------------------------------------------------- */
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert("No biometric hardware on device");
      return;
    }

    const enrolledOnDevice = await LocalAuthentication.isEnrolledAsync();
    if (!enrolledOnDevice) {
      Alert.alert("No biometrics enrolled on this device");
      return;
    }

    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate to check-${checkType}`,
    });

    if (!res.success) {
      Alert.alert("Authentication failed");
      return;
    }

    await registerAttendanceUnified({
      studentId,
      classId: selectedClassId,
      mode: checkType,
      biometric: true,
    });

    setConfirmation({
      name: student.name ?? "Student",
      mode: checkType,
      time: new Date().toLocaleTimeString(),
    });

    setTimeout(() => setConfirmation(null), 3000);
  } catch (err: any) {
    console.error("Fingerprint error:", err);
    Alert.alert("Error", err?.message ?? String(err));
  } finally {
    setLoading(false);
  }
}


  function goToQR(mode?: "in" | "out") {
    const attendanceCheck = isAttendanceAllowed();
if (!attendanceCheck.allowed) {
  Alert.alert("Attendance not allowed", attendanceCheck.reason);
  return;
}

    if (!selectedClassId) {
      Alert.alert("Select class first");
      return;
    }

    router.push({
      pathname: "/attendance/qr",
      params: { classId: selectedClassId, mode },
    } as any);
  }

  const selectedClass = classes.find(
    (c) => c.classId === selectedClassId || c.id === selectedClassId
  );

  function renderClassChip({ item }: { item: ClassRecord }) {
    const selected = item.classId === selectedClassId || item.id === selectedClassId;
    return (
      <Pressable
        onPress={() => setSelectedClassId(item.classId ?? item.id ?? null)}
        className={`px-3 py-2 rounded-full mr-3 ${
          selected ? "bg-primary" : "bg-white"
        }`}
        style={selected ? undefined : { borderWidth: 1, borderColor: "#E5E7EB" }}
      >
        <Text className={`${selected ? "text-white" : "text-dark"}`}>
          {item.name}
        </Text>
      </Pressable>
    );
  }

 function renderListHeader() {
  const attendanceCheck = isAttendanceAllowed(); // ✅ declare here, outside JSX

  return (
    <>
      {/* Banner if attendance blocked */}
      {!attendanceCheck.allowed && (
        <View className="bg-yellow-100 p-4 rounded-lg mb-4 mx-4">
          <Text className="text-yellow-800 font-semibold text-center">
            {attendanceCheck.reason}
          </Text>
        </View>
      )}


      {/* Hero Image */}
<View className="bg-white -mx-4">
   <Image
  source={require("../../assets/images/how-it-works.jpg")}
  style={{ width: "100%", height: 130 }}
  resizeMode="stretch"
/>
</View>
        {/* Class Picker */}
        <View className="mb-4">
          <Text className="text-m text-bold mb-2">Choose class</Text>
          {classesLoading ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={classes}
              horizontal
              renderItem={renderClassChip}
              keyExtractor={(item) => item.id!}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>

        {/* Biometric Attendance Toggle */}
        <Pressable
          onPress={() => setShowBiometric(!showBiometric)}
          className="bg-white rounded-2xl p-5 shadow flex-row items-center mb-5"
        >
          <View className="p-4 bg-primary/10 rounded-xl mr-4">
            <MaterialCommunityIcons name="fingerprint" size={28} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-dark">Biometric Attendance</Text>
            <Text className="text-sm text-neutral mt-1">
              {showBiometric
                ? "Tap a student to check-in or check-out via fingerprint."
                : "Check-in or check-out using fingerprint authentication."}
            </Text>
          </View>
          <MaterialIcons
            name={showBiometric ? "keyboard-arrow-up" : "arrow-forward-ios"}
            size={16}
            color="#64748B"
          />
        </Pressable>

        {/* QR Actions */}
        <Pressable
          onPress={() => goToQR("in")}
          className="bg-white rounded-2xl p-5 shadow flex-row items-center mb-5"
        >
          <View className="p-4 bg-primary/10 rounded-xl mr-4">
            <MaterialIcons name="qr-code-scanner" size={28} color="#1E3A8A" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-dark">Scan QR Code</Text>
            <Text className="text-sm text-neutral mt-1">Check-in via QR scan.</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={16} color="#64748B" />
        </Pressable>

        <Pressable
          onPress={() => goToQR("out")}
          className="bg-white rounded-2xl p-5 shadow flex-row items-center mb-5"
        >
          <View className="p-4 bg-accent1/10 rounded-xl mr-4">
            <MaterialIcons name="qr-code-scanner" size={28} color="#0EA5E9" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-dark">Scan QR Code</Text>
            <Text className="text-sm text-neutral mt-1">Check-out via QR scan.</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={16} color="#64748B" />
        </Pressable>

       {/* How it works - hide if biometric expanded */}
{!showBiometric && (
  <View className="mt-8 bg-white rounded-2xl p-4 shadow">
    <Text className="font-semibold text-dark text-base mb-2">How it works</Text>

    <View className="space-y-3 mb-4">
      <View className="flex-row items-center">
        <MaterialIcons name="check-circle" size={20} color="#10B981" />
        <Text className="ml-3 text-neutral">Scan QR or fingerprint for check-in.</Text>
      </View>
      <View className="flex-row items-center">
        <MaterialIcons name="check-circle" size={20} color="#10B981" />
        <Text className="ml-3 text-neutral">Scan QR or fingerprint for check-out.</Text>
      </View>
      <View className="flex-row items-center">
        <MaterialIcons name="check-circle" size={20} color="#10B981" />
        <Text className="ml-3 text-neutral">Attendance is logged automatically.</Text>
      </View>
    </View>


  </View>
)}


        <View style={{ height: 20 }} />
      </>
    );
  }

  return (
    <View className="flex-1 bg-slate-300">
      {/* Header */}
      <View className="bg-[#0B1C33] px-6 pt-2 pb-4 border-b border-blue-900/40 shadow-md">
       
        <View className="flex-row items-center mb-2">
  <Pressable
    onPress={() => router.back()}
    className="p-1 mr-2"
    hitSlop={8}
  >
    <MaterialIcons
      name="arrow-back"
      size={26}
      color="#ffffff"
    />
  </Pressable>
 <View className="flex-row items-center">
          <MaterialIcons name="fact-check" size={28} color="#3B82F6" />
        </View>
  <Text className="text-3xl font-extrabold text-white">
   Attendance
  </Text>
</View>
      </View>


      {/* Student List for Biometric */}
     {showBiometric && (
  <>
    {students.length === 0 ? (
      <View className="flex-1 justify-center items-center px-6">
        <MaterialCommunityIcons
          name="account-off-outline"
          size={64}
          color="#64748B"
        />
        <Text className="mt-4 text-lg font-semibold text-dark text-center">
          No students found
        </Text>
        <Text className="mt-2 text-sm text-neutral text-center">
          This class has no students assigned, or students failed to load.
        </Text>

        <Pressable
          onPress={() => setShowBiometric(false)}
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    ) : (
      <>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id!}
          renderItem={({ item }) => (
            <StudentRow
              student={item}
              onCheckIn={() => tryFingerprint(item.id, "in")}
              onCheckOut={() => tryFingerprint(item.id, "out")}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingTop: 60 }}
        />

        <Pressable
          onPress={() => setShowBiometric(false)}
          className="absolute top-4 right-4 bg-red-500 px-4 py-2 rounded-full shadow-lg z-50"
        >
          <Text className="text-white font-semibold">Close</Text>
        </Pressable>
      </>
    )}
  </>
)}


      {/* Main Header + ListHeaderComponent */}
      {!showBiometric && (
        <FlatList<any>
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Confirmation Card */}
      {confirmation && (
        <View className="absolute bottom-10 left-0 right-0 items-center px-4">
          <View className="bg-white rounded-2xl px-6 py-4 shadow-lg border border-gray-200">
            <Text className="text-lg font-semibold text-dark">
              {confirmation.mode === "in" ? "Checked In" : "Checked Out"}
            </Text>
            <Text className="mt-1 text-neutral text-base">{confirmation.name}</Text>
            <Text className="text-xs text-neutral/60 mt-1">{confirmation.time}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
