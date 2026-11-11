import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";

import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="containers" />
        <Stack.Screen name="establishments" />
        <Stack.Screen name="dispatch" />
        <Stack.Screen name="scanner" />
        <Stack.Screen name="container-labels" />
        <Stack.Screen name="returns" />
      </Stack>
    </ThemeProvider>
  );
}
