import "react-native-gesture-handler";

import { StatusBar } from "expo-status-bar";
import React from "react";

import { AppProviders } from "./src/providers/AppProviders";
import { useTheme } from "./src/providers/ThemeProvider";
import { MapScreen } from "./src/screens/MapScreen";

function AppContent() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <MapScreen />
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
