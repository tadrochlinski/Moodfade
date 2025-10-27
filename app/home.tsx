import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  ScrollView,
  View,
  Pressable,
  Linking,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as SecureStore from 'expo-secure-store';
import { useUser } from '../contexts/UserContext';
import { useSpotify } from '../contexts/SpotifyContext';
import { useRouter } from 'expo-router';
import useMoodSongs from '../hooks/useMoodSongs';
import loadingAnimation from '../assets/lottie/loading.json';
import backgroundAnimation from '../assets/lottie/Background.json';

const { width } = Dimensions.get('window');

const moodEmojis: Record<string, string> = {
  'Positive & Uplifting': '😊',
  'Romantic & Sensual': '💖',
  'Energetic & Intense': '🔥',
  'Calm & Reflective': '🌙',
  'Melancholic & Dark': '🌧️',
  'Unconventional & Playful': '🎭',
};

export default function HomeScreen() {
  const { userData } = useUser();
  const { token, refreshToken, loading: spotifyLoading } = useSpotify();
  const router = useRouter();

  const [playlistReady, setPlaylistReady] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const name = userData?.name || 'Friend';
  const mood = userData?.mood || 'Unknown';
  const emoji = moodEmojis[mood] || '🎵';

  const rawArtists = Array.isArray(userData?.favoriteArtists)
    ? userData.favoriteArtists
    : typeof userData?.favoriteArtists === 'string'
    ? [userData.favoriteArtists]
    : [];

  const favoriteArtistsDisplay =
    rawArtists.length > 2
      ? `${rawArtists.slice(0, 2).join(', ')} and more`
      : rawArtists.join(', ') || 'N/A';

  const { tracks, loading } = useMoodSongs(mood);

  // 🎬 Fade-in przy wejściu
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // 🎧 logi pomocnicze
  useEffect(() => {
    if (!loading) {
      console.log(`🎧 Found ${tracks.length} tracks for mood "${mood}":`);
      tracks.forEach((track, index) => {
        console.log(`${index + 1}. ${track.title} — ${track.author}`);
      });
    }
  }, [tracks, loading, mood]);

  useEffect(() => {
    async function syncPlaylist() {
      if (!token || loading || tracks.length === 0) return;
      let validToken = token;

      try {
        const testRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${validToken}` },
        });

        if (testRes.status === 401) {
          console.warn('⚠️ Spotify token expired — attempting refresh...');
          await refreshToken();
          const newToken = await SecureStore.getItemAsync('spotify_token');
          if (!newToken) return;
          validToken = newToken;
        }

        const userRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        const user = await userRes.json();

        const plRes = await fetch(
          `https://api.spotify.com/v1/users/${user.id}/playlists?limit=50`,
          { headers: { Authorization: `Bearer ${validToken}` } }
        );
        const plData = await plRes.json();

        let playlistId = plData.items?.find((p: any) => p.name === 'Moodfade')?.id;
        let playlistUrl = plData.items?.find((p: any) => p.name === 'Moodfade')?.external_urls?.spotify;

        if (!playlistId) {
          const createRes = await fetch(
            `https://api.spotify.com/v1/users/${user.id}/playlists`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${validToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: 'Moodfade',
                description: 'Your Moodfade playlist',
                public: false,
              }),
            }
          );

          const created = await createRes.json();
          playlistId = created.id;
          playlistUrl = created.external_urls?.spotify;
          console.log('✅ Playlist created:', created.name);
        }

        const uris: string[] = [];
        const favoriteArtists = rawArtists.filter((a) => a && a.length > 0);
        for (const artist of favoriteArtists) {
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artist)}&type=track&limit=3`,
            { headers: { Authorization: `Bearer ${validToken}` } }
          );
          const data = await res.json();
          data.tracks?.items?.forEach((track: any) => uris.push(`spotify:track:${track.id}`));
        }

        for (const track of tracks) {
          const query = `track:${track.title} artist:${track.author}`;
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
            { headers: { Authorization: `Bearer ${validToken}` } }
          );
          const data = await res.json();
          const found = data.tracks?.items?.[0];
          if (found) uris.push(`spotify:track:${found.id}`);
        }

        if (playlistId && uris.length > 0) {
          await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${validToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris }),
          });
          console.log(`🎧 Added ${uris.length} tracks to Moodfade playlist.`);
        }

        if (playlistUrl) setPlaylistUrl(playlistUrl);
        setPlaylistReady(true);
      } catch (err) {
        console.error('❌ Error syncing playlist:', err);
      }
    }

    syncPlaylist();
  }, [token, loading, tracks]);

  if (spotifyLoading || loading || !playlistReady) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView source={loadingAnimation} autoPlay loop style={{ width: 150, height: 150 }} />
        <Text style={{ color: '#ccc', marginTop: 20 }}>Preparing your playlist...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.fullScreen, { opacity: fadeAnim }]}>
      <View style={styles.backgroundOverlay} />
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {name}, your playlist is ready! {emoji}
        </Text>
        <Text style={styles.subtitle}>
          {emoji} {mood}
        </Text>
        <Text style={styles.label}>With your favorite artists:</Text>
        <Text style={styles.artists}>{favoriteArtistsDisplay}</Text>

        {playlistUrl && (
          <Pressable onPress={() => Linking.openURL(playlistUrl)} style={{ marginBottom: 20 }}>
            <LinearGradient
              colors={['#FF6EC4', '#7873F5'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>Open in Spotify</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Pressable onPress={() => router.push('/feedback')} style={styles.feedbackButton}>
          <Text style={styles.feedbackText}>End Session</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000' },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: -1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexGrow: 1, padding: 30, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  subtitle: { color: '#fff', fontSize: 20, textAlign: 'center', marginBottom: 20 },
  label: { color: '#ccc', fontSize: 16, textAlign: 'center' },
  artists: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 10, marginBottom: 40 },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  gradientButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  feedbackButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  feedbackText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
