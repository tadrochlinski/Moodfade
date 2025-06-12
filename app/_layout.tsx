import { Slot } from 'expo-router';
import { SpotifyProvider } from '../contexts/SpotifyContext';

export default function Layout() {
  return (
    <SpotifyProvider>
      <Slot />
    </SpotifyProvider>
  );
}
