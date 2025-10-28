import { Stack } from 'expo-router';
import { SpotifyProvider } from '../contexts/SpotifyContext';
import { UserProvider } from '../contexts/UserContext';
import { AuthProvider } from '@/contexts/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SpotifyProvider>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Ekrany spoza tabów */}
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="token" />
            <Stack.Screen name="feedback" />

            {/* 🔹 Kluczowy wpis — layout tabs */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </UserProvider>
      </SpotifyProvider>
    </AuthProvider>
  );
}
