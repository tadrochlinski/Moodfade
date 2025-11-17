import { Stack } from "expo-router";
import { SpotifyProvider } from "../contexts/SpotifyContext";
import { UserProvider } from "../contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SpotifyProvider>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="token" />
            <Stack.Screen name="feedback" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </UserProvider>
      </SpotifyProvider>
    </AuthProvider>
  );
}
