// mobile/app/index.tsx
import React, { JSX, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
    Image,   // ✅ add this
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, Link } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth as firebaseAuth } from "./firebase";
import { signOutUser } from "../src/services/auth";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Entypo } from "@expo/vector-icons";
import useCurrentUser from "../src/hooks/useCurrentUser";
import { getAttendanceSettings } from "../src/services/attendanceSettings";

/* ---------- helpers ---------- */

function shortName(email?: string | null) {
  if (!email) return "";
  return email.split("@")[0];
}

// Step 4 — formatTime helper (NOT inside component)
function formatTime(time?: string) {
  if (!time) return "--";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // ✅ FORCE AM / PM
  });
}


export default function Home(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);
  const { userDoc, loading: userDocLoading } = useCurrentUser();
  const [showWelcome, setShowWelcome] = useState(true);

  // Step 2 — attendance settings state
 const [attendanceSettings, setAttendanceSettings] = useState<{
  lateAfter?: string;
  closeAfter?: string;
  timezone?: string;
}>({});


  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Step 3 — load attendance settings
 useFocusEffect(
  React.useCallback(() => {
    let active = true;

    (async () => {
      try {
        const settings = await getAttendanceSettings();
        if (active) setAttendanceSettings(settings);
      } catch (e) {
        console.warn("Failed to load attendance settings");
      }
    })();

    return () => {
      active = false;
    };
  }, [])
);


  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
    } catch (err: any) {
      console.error("SignOut failed:", err);
      Alert.alert("Sign out failed", err?.message ?? String(err));
      setSigningOut(false);
    }
  }

  if (user === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-light items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const isAdmin = Boolean(userDoc?.role === "admin");

  return (
   <SafeAreaView
  className="flex-1 bg-blue-900"
  edges={["left", "right", "bottom"]}   // 🚫 no top padding
>


 {/* Subtitle / Action Banner (NOT a header) */}
<View style={{ backgroundColor: '#1e293b' }} className="px-6 py-2">

  <View className="flex-row items-center justify-between">
    <View className="flex-1 pr-2">
      <Text
        className="text-lg font-semibold text-white"
        style={{ includeFontPadding: false }}
      >
        Manage check-in • check-out • reports
      </Text>
    </View>
  </View>

  {/* Action row */}
  <View className="mt-4 flex-row items-center justify-between">
    <View className="flex-row items-center space-x-3">
      <View className="bg-white/15 rounded-full px-3 py-2 flex-row items-center">
        <MaterialIcons name="qr-code-scanner" size={16} color="#FFFFFF" />
        <Text className="text-white ml-2 text-m">QR</Text>
      </View>

      <View className="bg-white/15 rounded-full px-3 py-2 flex-row items-center">
        <Entypo name="fingerprint" size={16} color="#FFFFFF" />
        <Text className="text-white ml-2 text-m">Biometric</Text>
      </View>
    </View>

    <Pressable
      onPress={() => router.push("/attendance/checkin")}
      className="bg-yellow-400 px-4 py-2 rounded-full"
    >
      <Text className="text-blue-900 font-bold">Start</Text>
    </Pressable>
  </View>
</View>
{/* Hero Image */}
<View className="bg-white">
  <Image
    source={require("../assets/images/how-it-works2.jpg")}
    style={{ width: "100%", height: 130 }}
    resizeMode="stretch"
  />
</View>





      {/* 🌟 Welcome Popup */}
      {showWelcome && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/40 items-center justify-center px-6 z-50">
          <View className="w-full bg-white rounded-3xl p-6 shadow-2xl">
            <LinearGradient
              colors={["#1E3A8A", "#2563EB", "#0EA5E9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl p-4"
            >
              <Text className="text-xl font-extrabold text-yellow-300 text-center">
                Welcome to ASTEM
              </Text>

              <Text className="text-sm text-white mt-2 text-center leading-5">
                Accra Science, Technology, Engineering & Mathematics (ASTEM)
              </Text>

              <View className="mt-4 bg-white/20 p-3 rounded-xl">
                <Text className="text-white text-center text-sm">
                  Manage Attendance • Students • Reports
                </Text>
              </View>

              <Pressable
                onPress={() => setShowWelcome(false)}
                className="mt-5 bg-white rounded-full py-3"
              >
                <Text className="text-primary font-semibold text-center">
                  Continue
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        </View>
      )}

      {/* Content area */}
      <ScrollView contentContainerStyle={{ padding: 16 }} className="flex-1">
        {/* Quick cards */}
        <View className="grid grid-cols-2 gap-4">
          <Link href="/attendance/checkin" asChild>
            <Pressable className="bg-white rounded-2xl p-4 shadow flex-row items-center">
              <View className="p-3 rounded-lg bg-primary/10 mr-3">
                <MaterialIcons name="qr-code" size={22} color="#1E3A8A" />
              </View>
              <View>
                <Text className="font-semibold text-dark">Scan QR</Text>
                <Text className="text-sm text-neutral mt-1">
                  Fast student check-in/out
                </Text> 
              </View>
            </Pressable>
          </Link>

        
          <Link href="/reports" asChild>
            <Pressable className="bg-white rounded-2xl p-4 shadow flex-row items-center">
              <View className="p-3 rounded-lg bg-secondary/10 mr-3">
                <MaterialIcons name="bar-chart" size={22} color="#FACC15" />
              </View>
              <View>
                <Text className="font-semibold text-dark">Reports</Text>
                <Text className="text-sm text-neutral mt-1">
                Daily • Weekly •  Monthly •  Termly
                </Text>
              </View>
            </Pressable>
          </Link>

          {isAdmin ? (
            <Pressable
              onPress={() => router.push("/admin")}
              className="bg-white rounded-2xl p-4 shadow flex-row items-center"
            >
              <View className="p-3 rounded-lg bg-primary/10 mr-3">
                <MaterialIcons
                  name="admin-panel-settings"
                  size={22}
                  color="#1E3A8A"
                />
              </View>
              <View>
                <Text className="font-semibold text-dark">Admin</Text>
                <Text className="text-sm text-neutral mt-1">
                  Setup terms, classes & users
                </Text>
              </View>
            </Pressable>
          ) : (
            <View />
          )}

          <Pressable
            onPress={() => router.push("/students")}
            className="bg-white rounded-2xl p-4 shadow flex-row items-center"
          >
            <View className="p-3 rounded-lg bg-red/10 mr-3">
              <Entypo name="add-to-list" size={22} color="#EF4444" />
            </View>
            <View>
              <Text className="font-semibold text-dark">Add Student</Text>
              <Text className="text-sm text-neutral mt-1">
                Enroll new student
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View className="mt-6 bg-white rounded-2xl p-4 shadow">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold text-dark">Quick Actions</Text>
            <Text className="text-sm text-neutral">Today</Text>
          </View>

          <View className="space-y-3">
            <Pressable
              onPress={() => router.push("/attendance/checkin")}
              className="p-3 rounded-lg bg-primary/5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <MaterialIcons name="login" size={18} color="#1E3A8A" />
                <Text className="ml-3 text-dark">
                  Start class check-in
                </Text>
              </View>
             <Text className="text-sm text-neutral">
  • {formatTime(attendanceSettings.lateAfter)}

</Text>

            </Pressable>

            <Pressable
              onPress={() => router.push("/attendance/checkin")}
              className="p-3 rounded-lg bg-red/5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <MaterialIcons name="logout" size={18} color="#EF4444" />
                <Text className="ml-3 text-dark">
                  End of day check-out
                </Text>
              </View>
             <Text className="text-sm text-neutral">
  • {formatTime(attendanceSettings.closeAfter)}

</Text> 
    </Pressable>

            <Pressable
              onPress={() => router.push("/reports")}
              className="p-3 rounded-lg border border-slate-100 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <MaterialIcons name="insights" size={18} color="#0F172A" />
                <Text className="ml-3 text-dark">
                  View weekly report
                </Text>
              </View>
              <Text className="text-sm text-neutral">• 5 days</Text>
            </Pressable>
          </View>
        </View>

        {/* Sign out */}
        <View className="mt-6">
          <Pressable
            onPress={handleSignOut}
            className="py-3 px-4 rounded-2xl items-center"
            style={{ backgroundColor: "#EF4444" }}
            disabled={signingOut}
          >
            <Text className="text-white font-semibold">
              {signingOut ? "Signing out…" : "Sign out"}
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View className="mt-6 items-center">
          <Text className="text-xs text-neutral">
            Developer • Solomon K. Aggrey
          </Text>
          <Text className="text-xs text-neutral">
            ASTEM Attendance • Mobile app
          </Text>
          <Text className="text-xs text-neutral">Version 1.0</Text>
        </View>

        <View style={{ height: Platform.OS === "ios" ? 40 : 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
