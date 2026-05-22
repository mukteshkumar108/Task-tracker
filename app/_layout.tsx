import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

import { AppStateProvider, useAppState } from "@/contexts/app-state";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootStack />
    </AppStateProvider>
  );
}

function RootStack() {
  const { colors, themeMode } = useAppState();

  return (
    <>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background
          }
        }}
      />
    </>
  );
}
