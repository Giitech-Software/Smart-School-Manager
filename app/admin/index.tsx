// mobile/app/admin/index.tsx
import * as React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import useCurrentUser from "../../src/hooks/useCurrentUser";
import { listTerms } from "../../src/services/terms";
import { listWeeks } from "../../src/services/weeks";
import { listClasses } from "../../src/services/classes";
import { listStudents } from "../../src/services/students";

interface Class {
  id: string;
  name: string;
  description?: string;
}

export default function AdminIndex() {
  const router = useRouter();
  const { userDoc, loading: userDocLoading } = useCurrentUser();

  const [termsCount, setTermsCount] = React.useState<number | null>(null);
  const [weeksCount, setWeeksCount] = React.useState<number | null>(null);
  const [classesCount, setClassesCount] = React.useState<number | null>(null);
  const [studentsCount, setStudentsCount] = React.useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = React.useState(true);

  const [classes, setClasses] = React.useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = React.useState(true);
const [classesExpanded, setClassesExpanded] = React.useState(false);

  const isAdmin = Boolean(userDoc?.role === "admin");

  
  React.useEffect(() => {
    if (userDocLoading) return;

    if (!userDoc) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      Alert.alert("Access denied", "You must be an admin to access this page.");
      router.replace("/");
    }
  }, [userDoc, userDocLoading, isAdmin, router]);

  React.useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      setLoadingCounts(true);
      setLoadingClasses(true);

      try {
        const [terms, clsList, students, weeks] = await Promise.all([
          listTerms().catch(() => []),
          listClasses().catch(() => []),
          listStudents().catch(() => []),
          listWeeks().catch(() => []),
        ]);

        if (!mounted) return;

        setTermsCount(Array.isArray(terms) ? terms.length : null);
        setWeeksCount(Array.isArray(weeks) ? weeks.length : null);
        setClassesCount(Array.isArray(clsList) ? clsList.length : null);
        setStudentsCount(Array.isArray(students) ? students.length : null);

        if (Array.isArray(clsList)) {
          setClasses(clsList as Class[]);
        }
      } catch (err) {
        console.error("loadCounts error:", err);
      } finally {
        if (mounted) {
          setLoadingCounts(false);
          setLoadingClasses(false);
        }
      }
    }

    loadCounts();
    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     QUICK SETUP CONFIG
  ========================= */

  const quickSetupColors = {
  createTerm: "bg-amber-100",
  manageClasses: "bg-emerald-100",
  manageStudents: "bg-sky-100",
  generateQRs: "bg-violet-100",
  manageUsers: "bg-rose-100",
  manageParents: "bg-teal-100",
  adminLogs: "bg-slate-200", // ✅ NEW
};

const quickSetupHeadingColors = {
  createTerm: "text-amber-800",
  manageClasses: "text-emerald-800",
  manageStudents: "text-sky-800",
  generateQRs: "text-violet-800",
  manageUsers: "text-rose-800",
  manageParents: "text-teal-800",
  adminLogs: "text-slate-800", // ✅ NEW
};

const quickSetupIcons = {
  createTerm: "calendar-today",
  manageClasses: "library-books",
  manageStudents: "school",
  generateQRs: "qr-code",
  manageUsers: "people",
  manageParents: "family-restroom",
  adminLogs: "history", // ✅ NEW
};


if (userDocLoading || userDoc === undefined) {
  return (
    <ActivityIndicator />
  );
}

return (
  <View className="flex-1 bg-slate-300">
    {/* ================= ADMIN HEADER ================= */}
    <View className="bg-[#0B1C33] px-6 pt-3 pb-4 border-b border-blue-900/40 shadow-md">
      <View className="flex-row items-center mb-2">
        <Pressable
          onPress={() => router.back()}
          className="p-1 mr-2"
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={26} color="#ffffff" />
        </Pressable>

        <View className="flex-row items-center mr-2">
          <MaterialIcons
            name="admin-panel-settings"
            size={22}
            color="#60A5FA"
          />
        </View>

        <Text className="text-3xl font-extrabold text-white">Admin</Text>
      </View>

      <View className="flex-row items-center mt-1">
        <MaterialIcons name="settings" size={16} color="#38BDF8" />
        <Text className="text-blue-300 ml-1">
          Setup terms • classes • users
        </Text>
      </View>
    </View>

    {/* ================= CONTENT ================= */}
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-4 space-y-4">
        {/* ================= QUICK SETUP ================= */}
        <Text className="text-lg font-semibold">Quick setup</Text>

        {/* Manage Terms */}
        <Pressable
          onPress={() => router.push("/terms")}
          className={`rounded-2xl p-4 shadow flex-row items-center justify-between ${quickSetupColors.createTerm}`}
        >
          <View className="flex-row items-center space-x-3">
            <View className="p-2 rounded-full bg-white/60">
              <MaterialIcons
                name={quickSetupIcons.createTerm as any}
                size={20}
                color="#1E293B"
              />
            </View>
            <View>
              <Text className={`font-semibold ${quickSetupHeadingColors.createTerm}`}>
                Manage Terms
              </Text>
              <Text className="text-sm text-neutral mt-1">
                Create, edit & delete academic terms
              </Text>
            </View>
          </View>
          <View className="items-end">
            {loadingCounts ? (
              <ActivityIndicator />
            ) : (
              <Text className="text-sm text-neutral">
                {termsCount ?? 0} existing
              </Text>
            )}
            <MaterialIcons name="chevron-right" size={20} color="#64748B" />
          </View>
        </Pressable>

        {/* Manage Students */}
        <Pressable
          onPress={() => router.push("/students")}
          className={`rounded-2xl p-4 shadow flex-row items-center justify-between ${quickSetupColors.manageStudents}`}
        >
          <View className="flex-row items-center space-x-3">
            <View className="p-2 rounded-full bg-white/60">
              <MaterialIcons
                name={quickSetupIcons.manageStudents as any}
                size={20}
                color="#1E293B"
              />
            </View>
            <View>
              <Text className={`font-semibold ${quickSetupHeadingColors.manageStudents}`}>
                Manage Students
              </Text>
              <Text className="text-sm text-neutral mt-1">
                Enroll or assign students to classes
              </Text>
            </View>
          </View>
          <View className="items-end">
            {loadingCounts ? (
              <ActivityIndicator />
            ) : (
              <Text className="text-sm text-neutral">
                {studentsCount ?? 0} existing
              </Text>
            )}
            <MaterialIcons name="chevron-right" size={20} color="#64748B" />
          </View>
        </Pressable>

        {/* Generate QRs */}
        <Pressable
          onPress={() => router.push("/students/qr-generator")}
          className={`rounded-2xl p-4 shadow flex-row items-center justify-between ${quickSetupColors.generateQRs}`}
        >
          <View className="flex-row items-center space-x-3">
            <View className="p-2 rounded-full bg-white/60">
              <MaterialIcons
                name={quickSetupIcons.generateQRs as any}
                size={20}
                color="#1E293B"
              />
            </View>
            <View>
              <Text className={`font-semibold ${quickSetupHeadingColors.generateQRs}`}>
                Generate QRs
              </Text>
              <Text className="text-sm text-neutral mt-1">
                Create signed QR codes for students
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#64748B" />
        </Pressable>

        {/* Manage Classes */}
        <Pressable
          onPress={() => router.push("/admin/classes" as any)}
          className="rounded-2xl p-4 shadow bg-emerald-100 flex-row items-center justify-between"
        >
          <View className="flex-row items-center space-x-3">
            <View className="p-2 rounded-full bg-white/60">
              <MaterialIcons name="library-books" size={20} color="#065F46" />
            </View>
            <View>
              <Text className="font-semibold text-emerald-800">
                Manage Classes
              </Text>
              <Text className="text-sm text-neutral mt-1">
                Create, edit & delete classes
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#64748B" />
        </Pressable>

        {/* Manage Users */}
        <Pressable
          onPress={() => router.push("/users")}
          className={`rounded-2xl p-4 shadow flex-row items-center justify-between ${quickSetupColors.manageUsers}`}
        >
          <View className="flex-row items-center space-x-3">
            <View className="p-2 rounded-full bg-white/60">
              <MaterialIcons
                name={quickSetupIcons.manageUsers as any}
                size={20}
                color="#1E293B"
              />
            </View>
            <View>
              <Text className={`font-semibold ${quickSetupHeadingColors.manageUsers}`}>
                Manage Users
              </Text>
              <Text className="text-sm text-neutral mt-1">
                Assign roles & edit users
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#64748B" />
        </Pressable>

        {/* Manage Parents */}
        <Pressable
          onPress={() => router.push("/users?role=parent")}
          className={`rounded-2xl p-4 shadow flex-row items-center justify-between ${quickSetupColors.manageParents}`}
        >
          <View className="flex-row items-center space-x-3">
            <View className="p-2 rounded-full bg-white/60">
              <MaterialIcons
                name={quickSetupIcons.manageParents as any}
                size={20}
                color="#1E293B"
              />
            </View>
            <View>
              <Text className={`font-semibold ${quickSetupHeadingColors.manageParents}`}>
                Manage Parents & Wards
              </Text>
              <Text className="text-sm text-neutral mt-1">
                Assign students to parents
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#64748B" />
        </Pressable>

       {/* ================= CLASSES (Expandable) ================= */}
<Pressable
  onPress={() => setClassesExpanded((v) => !v)}
  className="rounded-2xl p-4 shadow bg-emerald-50 flex-row items-center justify-between mt-6"
>
  <View className="flex-row items-center space-x-3">
    <View className="p-2 rounded-full bg-white/70">
      <MaterialIcons name="library-books" size={22} color="#065F46" />
    </View>
    <View>
      <Text className="font-semibold text-emerald-800">
        Assign Students to Classes
      </Text>
      <Text className="text-sm text-neutral mt-1">
        Select a class to assign students
      </Text>
    </View>
  </View>

  <MaterialIcons
    name={classesExpanded ? "expand-less" : "expand-more"}
    size={24}
    color="#065F46"
  />
</Pressable>
{classesExpanded && (
  <View className="mt-2 space-y-2">
    {loadingClasses ? (
      <ActivityIndicator className="mt-2" />
    ) : classes.length === 0 ? (
      <Text className="text-neutral mt-2 px-2">
        No classes available.
      </Text>
    ) : (
      classes.map((cls) => (
        <Pressable
          key={cls.id}
          onPress={() => router.push(`/admin/classes/${cls.id}`)}
          className="bg-white rounded-xl px-4 py-3 flex-row items-center justify-between shadow"
        >
          <View>
            <Text className="font-semibold text-dark">
              {cls.name}
            </Text>
            {!!cls.description && (
              <Text className="text-sm text-neutral mt-1">
                {cls.description}
              </Text>
            )}
          </View>

          <MaterialIcons
            name="chevron-right"
            size={20}
            color="#64748B"
          />
        </Pressable>
      ))
    )}
  </View>
)}

        {/* ================= ATTENDANCE ================= */}
        <View className="bg-white rounded-2xl p-4 shadow mt-6">
          <Text className="font-semibold text-lg mb-2">
            Attendance Management
          </Text>
          <Text className="text-slate-600 text-sm mb-3">
            Manage and review attendance records using these settings.
          </Text>

          <Pressable
            onPress={() => router.push("/admin/attendance-settings")}
            className="bg-indigo-600 rounded-xl p-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              Go to Attendance Time
            </Text>
          </Pressable>
       

        </View>
      </View>
    </ScrollView>
  </View>
)};
