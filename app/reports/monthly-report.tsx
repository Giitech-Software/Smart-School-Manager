// app/reports/monthly-report.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { listClasses } from "../../src/services/classes";
import { listStudents } from "../../src/services/students";
import { computeAttendanceSummaryForStudent } from "../../src/services/attendanceSummary";
import { getMonthRange } from "../../src/utils/dateRanges";
import { exportMonthlyAttendancePdf } from "../../src/services/exports/exportMonthlyAttendancePdf";
import { MaterialIcons } from "@expo/vector-icons";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function MonthlyReport() {
  const router = useRouter();

  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { fromIso, toIso, label } = useMemo(
    () => getMonthRange(year, month),
    [year, month]
  );

  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);

  const [summaries, setSummaries] = useState<any[]>([]);
  const [exportingMonthlyPdf, setExportingMonthlyPdf] = useState(false);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [cls, studs] = await Promise.all([
          listClasses().catch(() => []),
          listStudents().catch(() => []),
        ]);
        setClasses(cls || []);
        setStudents(studs || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* -------- FILTER STUDENTS BY CLASS -------- */
  const filteredStudents = useMemo(() => {
    if (!selectedClassKey) return students;
    return students.filter(
      (s) =>
        s.classId === selectedClassKey ||
        s.classDocId === selectedClassKey
    );
  }, [students, selectedClassKey]);

  /* -------- COMPUTE MONTH SUMMARY -------- */
  useEffect(() => {
    (async () => {
      if (filteredStudents.length === 0) {
        setSummaries([]);
        return;
      }

      setComputing(true);

      const rows = await Promise.all(
        filteredStudents.map(async (s) => {
          const sum = await computeAttendanceSummaryForStudent(
            s.id,
            fromIso,
            toIso
          );
          return {
            ...sum,
            studentName:
              s.name ?? s.displayName ?? s.rollNo ?? s.id,
          };
        })
      );

      rows.sort((a, b) => b.percentagePresent - a.percentagePresent);
      setSummaries(rows);
      setComputing(false);
    })();
  }, [filteredStudents, fromIso, toIso]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-300 p-4">
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
   Monthly Reports
  </Text>
</View>

      <Text className="text-sm text-slate-500 mt-1">{label}</Text>

      {/* -------- MONTH SELECT -------- */}
      <Text className="mt-6 mb-2 font-semibold">Select Month</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        {MONTHS.map((m, i) => (
          <Pressable
            key={m}
            onPress={() => setMonth(i)}
            className={`px-4 py-2 mr-3 rounded ${
              month === i ? "bg-blue-100" : "bg-white"
            }`}
          >
            <Text className="font-medium">{m}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* -------- CLASS FILTER -------- */}
      <Text className="mt-6 mb-2 font-semibold">Filter by Class</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Pressable
          onPress={() => setSelectedClassKey(null)}
          className={`px-4 py-2 mr-3 rounded-full ${
            selectedClassKey === null
              ? "bg-blue-600"
              : "bg-white border"
          }`}
        >
          <Text
            className={
              selectedClassKey === null
                ? "text-white font-semibold"
                : "text-slate-700"
            }
          >
            All Classes
          </Text>
        </Pressable>

        {classes.map((c) => {
          const key = c.classId ?? c.id;
          return (
            <Pressable
              key={key}
              onPress={() => setSelectedClassKey(key)}
              className={`px-4 py-2 mr-3 rounded-full ${
                selectedClassKey === key
                  ? "bg-blue-600"
                  : "bg-white border"
              }`}
            >
              <Text
                className={
                  selectedClassKey === key
                    ? "text-white font-semibold"
                    : "text-slate-700"
                }
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* -------- PDF EXPORT -------- */}
      <View className="mt-4">
        <Pressable
          disabled={exportingMonthlyPdf}
          onPress={async () => {
            try {
              setExportingMonthlyPdf(true);
              await exportMonthlyAttendancePdf({
                fromIso,
                toIso,
                label,
                classId: selectedClassKey ?? undefined,
              });
            } finally {
              setExportingMonthlyPdf(false);
            }
          }}
          className={`rounded-xl p-3 items-center justify-center ${
            exportingMonthlyPdf ? "bg-slate-400" : "bg-blue-600"
          }`}
        >
          {exportingMonthlyPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Export PDF</Text>
          )}
        </Pressable>
      </View>

      {/* -------- RESULTS -------- */}
      <Text className="mt-6 mb-2 font-semibold">
        Students ({summaries.length})
      </Text>

      {computing ? (
        <ActivityIndicator />
      ) : summaries.length === 0 ? (
        <Text className="text-slate-500">
          No attendance data for this month.
        </Text>
      ) : (
        summaries.map((s) => (
          <Pressable
            key={s.studentId}
            onPress={() =>
              router.push({
                pathname: "/reports/student/[id]",
                params: {
                  id: s.studentId,
                  fromIso,
                  toIso,
                  title: `${label} Report`,
                },
              })
            }
            className="bg-white p-4 rounded-xl mb-3 shadow"
          >
            <Text className="font-semibold">{s.studentName}</Text>

            <View className="flex-row justify-between mt-2">
              <Text className="text-emerald-600">
                P: {s.presentCount}
              </Text>
              <Text className="text-red-500">
                A: {s.absentCount}
              </Text>
              <Text className="text-slate-700">
                {s.percentagePresent.toFixed(1)}%
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
