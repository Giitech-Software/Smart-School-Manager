// app/_layout.tsx
import 'react-native-get-random-values';

import React from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, StatusBar, useColorScheme } from 'react-native';
import Avatar from '../components/Avatar';
import { auth } from './firebase';

import '../global.css';

function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // ✅ SAFETY: pathname can be undefined briefly (web / cold start)
  if (!pathname || pathname === '/' || pathname.startsWith('/(auth)')) {
    return null;
  }

  const isDark = colorScheme === 'dark';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#000000' : '#FFFFFF'}
      />

      <LinearGradient
        colors={['#1E3A8A', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']} className="px-6 pb-2">
          <View className="relative h-12 justify-center">
            <Text className="absolute inset-0 mt-2 text-white font-bold text-2xl text-center">
              ASTEM Attendance Register
            </Text>

            <View className="absolute right-0">
              <Avatar email={auth.currentUser?.email} size={42} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          header: () => <AppHeader />,
        }}
      />
    </SafeAreaProvider>
  );
}
