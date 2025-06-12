import { Slot } from 'expo-router';
import { SpotifyProvider } from '../contexts/SpotifyContext';
import { UserProvider } from '../contexts/UserContext';

export default function Layout() {
  return (
    <SpotifyProvider>
      <UserProvider>
        <Slot />
      </UserProvider>
    </SpotifyProvider>
  );
}
