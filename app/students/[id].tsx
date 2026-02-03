// mobile/app/students/[id].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { getStudentById, upsertStudent } from "../../src/services/students";
import type { Student } from "../../src/services/types";
import { MaterialIcons } from "@expo/vector-icons";

type _CHECK = Student["faceEmbedding"];


export default function StudentDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const s = await getStudentById(id as string);
        setStudent(s);
      } catch (err: any) {
        console.error("getStudentById error", err);
        Alert.alert("Failed to load student", err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave() {
    if (!student) return;
    setSaving(true);
    try {
      await upsertStudent(student);
      Alert.alert("Saved");
      router.back();
    } catch (err: any) {
      console.error("upsertStudent error", err);
      Alert.alert("Save failed", err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  if (!student) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-neutral">Student not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScreen>
      <View className="flex-1 bg-slate-300 p-4">
        <View className="flex-row items-center mb-2">
  <Pressable
    onPress={() => router.back()}
    className="p-1 mr-2"
    hitSlop={8}
  >
    <MaterialIcons
      name="arrow-back"
      size={26}
      color="#0f172a"
    />
  </Pressable>

  <Text className="text-2xl font-extrabold text-slate-900">
Edit Student
  </Text>
</View>

        <Text className="text-sm text-neutral">Full name</Text>
        <TextInput
          value={student.name}
          onChangeText={(t) => setStudent({ ...student, name: t })}
          className="border p-3 rounded-xl mb-3 bg-white"
        />
<Text className="text-sm text-neutral">Student ID</Text>
<TextInput
  value={student.studentId ?? ""}
  onChangeText={(t) =>
    setStudent({
      ...student,
      studentId: t.trim() || undefined, // ✅ critical
    })
  }
  placeholder="Leave empty to keep or auto-generate"
  className="border p-3 rounded-xl mb-3 bg-white"
/>

        <Text className="text-sm text-neutral">Class</Text>
        <TextInput
          value={student.classId ?? ""}
          onChangeText={(t) => setStudent({ ...student, classId: t })}
          className="border p-3 rounded-xl mb-3 bg-white"
        />

        <Text className="text-sm text-neutral">Roll no (optional)</Text>
        <TextInput
          value={student.rollNo ?? ""}
          onChangeText={(t) => setStudent({ ...student, rollNo: t })}
          className="border p-3 rounded-xl mb-4 bg-white"
        />

        <Pressable
          onPress={handleSave}
          className="bg-primary py-3 rounded-xl"
          disabled={saving}
        >
          <Text className="text-white text-center">
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(`/students/enroll-biometric?id=${student.id}`)
          }
          className="bg-primary py-3 px-4 rounded-xl mt-4"
        >
          <Text className="text-white text-center font-medium">
            Enroll Biometric
          </Text>
        </Pressable>

       <Pressable
  onPress={() =>
    router.push({
      pathname: "/admin/FaceEnrollment",
      params: { studentId: student.id },
    })
  }
>
  <Text>Enroll / Update Face</Text>
</Pressable>


{/* ✅ FACE STATUS (ADD THIS — nothing removed) */}
<View
  className={`mt-4 p-4 rounded-xl ${
    student.faceEmbedding ? "bg-green-100" : "bg-yellow-100"
  }`}
>
  <Text
    className={`font-semibold ${
      student.faceEmbedding ? "text-green-800" : "text-yellow-800"
    }`}
  >
    Face recognition
  </Text>

  <Text className="text-sm mt-1">
    {student.faceEmbedding
      ? "Face data is enrolled and ready for attendance."
      : "Face data not enrolled. Face attendance is disabled."}
  </Text>
</View>


<View className="mt-3 p-3 rounded-xl bg-white border border-slate-200">
  <Text className="text-sm text-neutral">
    Face status:{" "}
    <Text className="font-semibold">
      {student.faceEmbedding ? "Enrolled ✅" : "Not enrolled ❌"}
    </Text>
  </Text>
</View>

<Pressable
  onPress={() => {
    Alert.alert(
      "Remove Face Data",
      "This will permanently remove the student's face data. Face attendance will be disabled until re-enrolled.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await upsertStudent({
                ...student,
                faceEmbedding: null,
                faceEnrolledAt: null,
              });

              Alert.alert("Done", "Face data removed successfully");
            } catch (err: any) {
              console.error("Remove face error", err);
              Alert.alert(
                "Error",
                err?.message ?? "Failed to remove face data"
              );
            }
          },
        },
      ]
    );
  }}
  className="bg-red-600 py-3 px-4 rounded-xl mt-3"
>
  <Text className="text-white text-center font-medium">
    Remove Face Data
  </Text>
</Pressable>

      </View>
    </KeyboardAwareScreen>
  );
}
