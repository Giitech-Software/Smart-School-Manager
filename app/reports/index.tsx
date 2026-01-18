import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
    Image,   // ✅ add this
} from "react-native";
import { useRouter } from "expo-router";
import { getAttendanceSummary } from "../../src/services/attendanceSummary";
import { MaterialIcons } from "@expo/vector-icons";

export default function ReportsDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [globalSummary, setGlobalSummary] = useState<any[]>([]);

  /* ------------------------------------------------------------------ */
  /* LOAD GLOBAL SUMMARY (PREVIEW) */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const sum = await getAttendanceSummary({ includeStudentName: false });
        setGlobalSummary(sum || []);
      } catch (e) {
        console.error("reports dashboard load", e);
        Alert.alert("Failed to load reports preview");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ------------------------------------------------------------------ */
  /* AGGREGATE TOTALS */
  /* ------------------------------------------------------------------ */
 const totals = useMemo(() => {
  let present = 0, absent = 0, late = 0;

  for (const r of globalSummary) {
    present += Number(r.presentCount ?? 0);
    absent += Number(r.absentCount ?? 0);
    late += Number(r.lateCount ?? 0);
  }

  const attended = present + late;
  const total = attended + absent;

  return {
    present,
    late,
    absent,
    attended, // ✅ NEW
    pct: total === 0 ? 0 : (attended / total) * 100,
  };
}, [globalSummary]);


  /* ------------------------------------------------------------------ */
  /* TILE COMPONENT */
  /* ------------------------------------------------------------------ */
  const Tile = ({
    title,
    subtitle,
    color,
    onPress,
  }: {
    title: string;
    subtitle?: string;
    color: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={`mb-6 p-5 rounded-2xl shadow-lg w-full ${color}`}
      style={{ elevation: 4 }}
    >
      <Text className="text-lg font-extrabold text-white">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-white/80 mt-2">{subtitle}</Text>
      ) : null}
    </Pressable>
  );

  /* ------------------------------------------------------------------ */
  /* LOADING STATE */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ------------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------------ */
  return (
    <ScrollView
      className="flex-1 bg-slate-300"
      contentContainerStyle={{ padding: 16 }}
      
    >
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
    Reports
  </Text>
</View>
{/* Hero Image */}
<View className="bg-white -mx-4">
  <Image
    source={require("../../assets/images/attendance-report.jpg")}
    style={{ width: "100%", height: 140 }}
    resizeMode="stretch"
  />
</View>
<Text className="text-ml font-bold text-slate-800 py-4">
  Quick previews — tap a tile to open detailed reports
</Text>


      <View className="mt-2">
        <Tile
          title="Daily Attendance"
          subtitle="Preview by day • Last 5 school days"
          color="bg-purple-500"
          onPress={() => router.push("/reports/daily-report")}
        />
        <Tile
          title="Weekly Reports"
          subtitle="Attendance grouped by school week"
          color="bg-indigo-500"
          onPress={() => router.push("/reports/weekly-report")}
        />
        <Tile
          title="Monthly Reports"
          subtitle="Attendance grouped by calendar month"
          color="bg-teal-500"
          onPress={() => router.push("/reports/monthly-report")}
        />
        <Tile
          title="Termly Reports"
          subtitle="Summaries by term"
          color="bg-rose-500"
          onPress={() => router.push("/reports/termly-report")}
        />
      </View>

      {/* -------------------- PREVIEW SUMMARY -------------------- */}
     <View className="mt-6 p-4 bg-white rounded-xl shadow-sm">
  <Text className="text-sm font-semibold text-slate-700">
    Last 5 school days (preview)
  </Text>

  <View className="mt-3 flex-row justify-between">
    <View>
      <Text className="text-xs text-slate-500">Present</Text>
      <Text className="text-lg font-bold text-emerald-600">
        {totals.present}
      </Text>
    </View>

 {/* ✅ NEW — LATE SUMMARY */}
    <View>
      <Text className="text-xs text-slate-500">Late</Text>
      <Text className="text-lg font-bold text-amber-600">
        {totals.late}
      </Text>
    </View> 
<View>
  <Text className="text-xs text-slate-500">Attended</Text>
  <Text className="text-lg font-bold text-sky-600">
    {totals.attended}
  </Text>
</View>

    <View>
      <Text className="text-xs text-slate-500">Absent</Text>
      <Text className="text-lg font-bold text-red-500">
        {totals.absent}
      </Text>
    </View>

   

    <View>
      <Text className="text-xs text-slate-500">Attendance %</Text>
      <Text className="text-lg font-bold text-slate-900">
        {totals.pct.toFixed(1)}%
      </Text>
    </View>
  </View>
</View>
    </ScrollView>
  );
}
