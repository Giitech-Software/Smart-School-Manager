/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
  colors: {
    primary: "#1E3A8A",
    secondary: "#FACC15",
    light: "#FFFFFF",
    accent1: "#0EA5E9",
    accent2: "#10B981",
    neutral: "#64748B",
    dark: "#0F172A",
    danger: "#EF4444", // ✅ renamed
  },
},

  },
  plugins: [],
};
