// mobile/app.confi.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,

  name: "ASTEM Attendance Register",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "mobile",
  userInterfaceStyle: "automatic",

  /** 🔴 Disable for Expo Go */
  newArchEnabled: true,

  /** 🔹 MAIN APP ICON */
  icon: "./assets/images/icon.png",

  ios: {
    supportsTablet: true,
  },

  android: {
    package: "com.giitech_software_systems.mobile",
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    "softwareKeyboardLayoutMode": "resize",
    adaptiveIcon: {
  foregroundImage: "./assets/images/adaptive-icon-foreground.png",
  backgroundColor: "#0A4FB3",
},

  },

  plugins: [
    "expo-web-browser",
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        resizeMode: "cover",
        backgroundColor: "#E6F4FE",
      },
    ],
    "expo-secure-store",
  ],

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
    eas: { projectId: "39fe1569-e82e-4a40-9ee4-9c7c6f47b60b" }
  }
});

