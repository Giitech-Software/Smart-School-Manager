// mobile/app/staff/index.tsx
import React, { useState } from "react";
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Link } from "expo-router";
import { listStaff, deleteStaff } from "../../src/services/staff";
import type { Staff } from "../../src/services/types";
import { MaterialIcons } from "@expo/vector-icons";


export default function StaffList() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await loadStaff();
      })();
      return () => { active = false; };
    }, [])
  );

  async function loadStaff() {
    setLoading(true);
    try {
      const data = await listStaff();
      setStaffList(data);
    } catch (err: any) {
      console.error("listStaff error:", err);
      Alert.alert("Failed to load staff", err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name?: string) {
    Alert.alert(
      "⚠️ Confirm Delete",
      `Are you sure you want to delete "${name ?? 'this staff'}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            setDeletingId(id);
            try {
              await deleteStaff(id);
              setStaffList((cur) => cur.filter((s) => s.id !== id));
            } catch (err: any) {
              console.error("deleteStaff error", err);
              Alert.alert("Delete failed", err?.message ?? String(err));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-300 p-4">
     <View className="flex-row items-center justify-between mb-4">
  {/* Left: Back + Title */}
  <View className="flex-row items-center">
    <Pressable
      onPress={() => router.back()}
      className="p-1 mr-2"
      hitSlop={8}
    >
      <MaterialIcons name="arrow-back" size={26} color="#0f172a" />
    </Pressable>

    <Text className="text-2xl font-extrabold text-slate-900">
      Staff
    </Text>
  </View>

  {/* Right: Add Button */}
  <Pressable
    onPress={() => router.push("/staff/create")}
    className="bg-primary py-2 px-3 rounded-xl"
  >
    <Text className="text-white font-medium">Add</Text>
  </Pressable>
</View>


      <FlatList
        data={staffList}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between">
            <View>
              <Text className="font-semibold text-dark">{item.name}</Text>
              <Text className="text-sm text-neutral">{item.staffId}</Text>
              <Text className="text-xs mt-1">
                {item.fingerprintId ? "Biometric enrolled ✅" : "Biometric not enrolled ❌"}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Edit */}
            <Pressable
 onPress={() =>
  router.push({
    pathname: "/staff/[id]", 
    params: { id: item.id! },
  })
}
  className="p-2 rounded bg-white/20"
>
  <MaterialIcons name="edit" size={20} color="#1E3A8A" />
</Pressable>


              {/* Delete */}
              <Pressable
                onPress={() => handleDelete(item.id!, item.name)}
                className="p-2 rounded bg-white/20"
              >
                <MaterialIcons name="delete" size={20} color="#EF4444" />
              </Pressable>

              {/* Enroll Biometric */}
              {!item.fingerprintId && (
                <Pressable
                  onPress={() => router.push(`/staff/enroll-biometric?id=${item.id}`)}
                  className="px-2 py-1 rounded bg-blue-500"
                >
                  <Text className="text-white text-xs">Enroll</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-center text-neutral mt-8">No staff found.</Text>
        }
      />
    </View>
  );
}
