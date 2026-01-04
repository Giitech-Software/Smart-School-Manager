// mobile/app/users/index.tsx
// mobile/app/users/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

import {
  listUsers,
  deleteUser,
  AppUser,
} from "../../src/services/users";
import { MaterialIcons } from "@expo/vector-icons";

export default function UsersList() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
  React.useCallback(() => {
    let active = true;

    (async () => {
      if (!active) return;
      await load();
    })();

    return () => {
      active = false;
    };
  }, [])
);

  async function load() {
    setLoading(true);
    try {
      const d = await listUsers();
      setUsers(d);
    } catch (err: any) {
      console.error("listUsers", err);
      Alert.alert("Failed to load users", err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser(id);
      setUsers((s) => s.filter((u) => u.id !== id));
    } catch (err: any) {
      console.error("deleteUser", err);
      Alert.alert("Delete failed", err?.message ?? String(err));
    }
  }
function confirmDelete(user: AppUser) {
  Alert.alert(
    "Delete User",
    `Are you sure you want to delete ${
      user.displayName ?? user.email ?? "this user"
    }?\n\nThis action cannot be undone.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive", // 🔴 makes it red (iOS) and emphasized (Android)
        onPress: () => handleDelete(user.id!),
      },
    ]
  );
}

  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );

  return (
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
    Manage Users
  </Text>
</View>
      <FlatList
        data={users}
        keyExtractor={(i) => i.id ?? ""}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between">
            {/* LEFT: Arrow + Name + Role */}
          
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-slate-900">
                    {item.displayName ?? item.email}
                  </Text>
                  <Text className="text-sm text-neutral mt-1">
                    {item.role ?? "—"}
                  </Text>
                </View>
              
           

            {/* RIGHT: Actions */}
            <View className="flex-row items-center space-x-2">
              {/* ✅ UPDATED: role-aware routing */}
              <Pressable
                onPress={() => {
                  if (item.role === "parent") {
                    router.push(`/admin/parents/${item.id}` as any);
                  } else {
                    router.push(`/users/${item.id}` as any);
                  }
                }}
                className="p-2 rounded bg-white/20"
              >
                <Text>Edit</Text>
              </Pressable>

             <Pressable
  onPress={() => confirmDelete(item)}
  className="p-2 rounded"
>
  <Text className="text-red-500 font-semibold">
    Delete
  </Text>
</Pressable>

            </View>
          </View>
        )}
      />
    </View>
  );
}

