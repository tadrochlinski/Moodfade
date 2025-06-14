import React, { useEffect, useState } from 'react';
import {
  Text,
  ScrollView,
  View,
  Pressable,
  Linking,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useUser } from '../contexts/UserContext';
import { useSpotify } from '../contexts/SpotifyContext';
import { useRouter } from 'expo-router';
import useMoodSongs from '../hooks/useMoodSongs';
import loadingAnimation from '../assets/lottie/loading.json';
import backgroundAnimation from '../assets/lottie/Background.json';

const { width, height } = Dimensions.get('window');

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
  const { token } = useSpotify();
  const router = useRouter();

  const [playlistReady, setPlaylistReady] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

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

      try {
        const userRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = await userRes.json();

        const plRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const plData = await plRes.json();
        const existing = plData.items.find((p: any) => p.name === 'Moodfade');
        let playlistId = existing?.id;
        let playlistUrl = existing?.external_urls?.spotify;

        if (!playlistId) {
          const createRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Moodfade',
              description: 'Your Moodfade playlist',
              public: false,
            }),
          });
          const created = await createRes.json();
          playlistId = created.id;
          playlistUrl = created.external_urls.spotify;
          console.log('✅ Playlist created:', created.name);
        } else {
          console.log('ℹ️ Playlist already exists.');
        }

        const uris: string[] = [];

        for (const track of tracks) {
          const query = `track:${track.title} artist:${track.author}`;
          const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await searchRes.json();
          const found = data.tracks?.items?.[0];
          if (found) {
            uris.push(`spotify:track:${found.id}`);
            console.log(`🎯 Matched: ${track.title} — ${track.author}`);
          } else {
            console.warn(`❌ Not found: ${track.title} — ${track.author}`);
          }
        }

        if (uris.length > 0 && playlistId) {
          await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris }),
          });

          console.log(`🎧 Added ${uris.length} tracks to Moodfade playlist.`);
        } else {
          console.warn('⚠️ No valid tracks found to add.');
        }

        if (playlistUrl) {
          setPlaylistUrl(playlistUrl);
        }

        setPlaylistReady(true);
      } catch (err) {
        console.error('❌ Error syncing playlist:', err);
      }
    }

    syncPlaylist();
  }, [token, loading, tracks]);

  if (loading || !playlistReady) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={loadingAnimation}
          autoPlay
          loop
          style={{ width: 150, height: 150 }}
        />
        <Text style={{ color: '#ccc', marginTop: 20 }}>Preparing your playlist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      {/* 🎥 Background Animation */}
      <LottieView
        source={backgroundAnimation}
        autoPlay
        loop
        style={StyleSheet.absoluteFill}
      />

      {/* 📃 Main content */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{name}, your playlist is ready! {emoji}</Text>
        <Text style={styles.subtitle}>{emoji} {mood}</Text>
        <Text style={styles.label}>With your favorite artists:</Text>
        <Text style={styles.artists}>{favoriteArtistsDisplay}</Text>

        {playlistUrl && (
          <Pressable onPress={() => Linking.openURL(playlistUrl)} style={{ marginBottom: 20 }}>
            <LinearGradient
              colors={['#FF6EC4', '#7873F5']}
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
    </View>
  );
}

const textShadow = {
  textShadowColor: '#000',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    ...textShadow,
  },
  subtitle: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    ...textShadow,
  },
  label: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    ...textShadow,
  },
  artists: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
    ...textShadow,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  gradientButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    ...textShadow,
  },
  feedbackButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  feedbackText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
