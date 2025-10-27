import { Slot } from 'expo-router';
import { SpotifyProvider } from '../contexts/SpotifyContext';
import { UserProvider } from '../contexts/UserContext';
import { AuthProvider } from '@/contexts/AuthProvider';

export default function Layout() {
  return (
    <AuthProvider>
      <SpotifyProvider>
        <UserProvider>
          <Slot />
        </UserProvider>
      </SpotifyProvider>
    </AuthProvider>
  );
}
