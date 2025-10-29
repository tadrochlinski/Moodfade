import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  ScrollView,
  View,
  Pressable,
  Linking,
  StyleSheet,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as SecureStore from 'expo-secure-store';
import { useUser } from '../../contexts/UserContext';
import { useSpotify } from '../../contexts/SpotifyContext';
import useMoodSongs from '../../hooks/useMoodSongs';
import loadingAnimation from '../../assets/lottie/loading.json';
import backgroundAnimation from '../../assets/lottie/Background.json';

const moodOptions = [
  { label: 'Positive & Uplifting', emoji: '😊', colors: ['#FF9A9E', '#FAD0C4'] },
  { label: 'Romantic & Sensual', emoji: '💖', colors: ['#FAD0C4', '#FFD1FF'] },
  { label: 'Energetic & Intense', emoji: '🔥', colors: ['#FF6E7F', '#BFE9FF'] },
  { label: 'Calm & Reflective', emoji: '🌙', colors: ['#667EEA', '#764BA2'] },
  { label: 'Melancholic & Dark', emoji: '🌧️', colors: ['#232526', '#414345'] },
  { label: 'Unconventional & Playful', emoji: '🎭', colors: ['#FDC830', '#F37335'] },
];

const feedbackOptions = ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'];

export default function HomeScreen() {
  const { userData, reloadUserData } = useUser();
  const { token, refreshToken, loading: spotifyLoading } = useSpotify();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [playlistReady, setPlaylistReady] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🔹 Dane użytkownika z kontekstu
  const name = userData?.name || 'Friend';
  const photoBase64 = userData?.photoBase64 ?? '';
  const avatarUrl =
    photoBase64 && photoBase64.length > 0
      ? photoBase64
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name
        )}&background=444&color=fff&size=128`;

  const rawArtists = Array.isArray(userData?.favoriteArtists)
    ? userData.favoriteArtists
    : typeof userData?.favoriteArtists === 'string'
    ? [userData.favoriteArtists]
    : [];

  const favoriteArtistsDisplay =
    rawArtists.length > 2
      ? `${rawArtists.slice(0, 2).join(', ')} and more`
      : rawArtists.join(', ') || 'N/A';

  const { tracks, loading } = useMoodSongs(selectedMood);

  // 🔹 Animacja wejścia
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // 🔹 Synchronizacja playlisty
  useEffect(() => {
    let cancelled = false;

    async function syncPlaylist() {
      if (!selectedMood || !token || loading || !tracks || tracks.length === 0) return;
      setPlaylistReady(false);

      let validToken = token;
      try {
        const testRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        if (testRes.status === 401) {
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
        let foundPlaylistUrl = plData.items?.find(
          (p: any) => p.name === 'Moodfade'
        )?.external_urls?.spotify;

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
          foundPlaylistUrl = created.external_urls?.spotify;
        }

        const uris: string[] = [];

        const fav = rawArtists.filter((a) => a && a.length > 0);
        for (const artist of fav) {
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(
              artist
            )}&type=track&limit=3`,
            { headers: { Authorization: `Bearer ${validToken}` } }
          );
          const data = await res.json();
          data.tracks?.items?.forEach((track: any) =>
            uris.push(`spotify:track:${track.id}`)
          );
          if (cancelled) return;
        }

        for (const track of tracks) {
          const query = `track:${track.title} artist:${track.author}`;
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(
              query
            )}&type=track&limit=1`,
            { headers: { Authorization: `Bearer ${validToken}` } }
          );
          const data = await res.json();
          const found = data.tracks?.items?.[0];
          if (found) uris.push(`spotify:track:${found.id}`);
          if (cancelled) return;
        }

        if (playlistId && uris.length > 0) {
          await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${validToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris }),
          });
        }

        if (!cancelled) {
          setPlaylistUrl(foundPlaylistUrl || null);
          setPlaylistReady(true);
        }
      } catch (err) {
        console.error('❌ Error syncing playlist:', err);
        if (!cancelled) setPlaylistReady(false);
      }
    }

    syncPlaylist();
    return () => {
      cancelled = true;
    };
  }, [selectedMood, token, loading, tracks, JSON.stringify(rawArtists)]);

  // 🔹 Header reagujący na zmiany userData
  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.userName}>{name}</Text>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
    </View>
  );

  // 🔹 Widok główny
  if (!selectedMood) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
        <Header />
        <View style={{ padding: 20 }}>
          <Text style={styles.moodPrompt}>What's your mood today?</Text>
          {moodOptions.map(({ label, emoji, colors }) => (
            <Pressable
              key={label}
              onPress={() => {
                setSelectedMood(label);
                setPlaylistReady(false);
                setPlaylistUrl(null);
              }}
              style={{ marginBottom: 15 }}
            >
              <LinearGradient
                colors={colors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, overflow: 'hidden' }}
              >
                <View style={styles.moodOption}>
                  <Text style={styles.moodText}>
                    {emoji} {label}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  const HeaderSpacer = () => <View style={{ height: 100 }} />;

  if (showFeedback) {
    return (
      <View style={styles.feedbackContainer}>
        <Header />
        <HeaderSpacer />
        <Text style={styles.feedbackTitle}>How do you feel?</Text>
        <Text style={styles.feedbackSubtitle}>
          Let us know how the music made you feel 🎧
        </Text>
        {feedbackOptions.map((option) => {
          const isSelected = selectedFeedback === option;
          return (
            <Pressable
              key={option}
              onPress={() => setSelectedFeedback(option)}
              style={{ marginBottom: 15, width: '100%' }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#ff00c3', '#00d4ff']}
                  start={[0, 0]}
                  end={[1, 1]}
                  style={{ padding: 2, borderRadius: 12 }}
                >
                  <View style={styles.feedbackOption}>
                    <Text style={[styles.feedbackOptionText, { fontWeight: 'bold' }]}>
                      {option}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.feedbackOption}>
                  <Text style={styles.feedbackOptionText}>{option}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            if (!selectedFeedback) return Alert.alert('Please select how you feel.');
            Alert.alert('Thank you!', `Feedback: ${selectedFeedback}`);
            setShowFeedback(false);
            setSelectedFeedback(null);
            setSelectedMood(null);
            setPlaylistReady(false);
            setPlaylistUrl(null);
          }}
          style={styles.feedbackButton}
        >
          <Text style={styles.feedbackText}>Submit Feedback</Text>
        </Pressable>
      </View>
    );
  }

  if (spotifyLoading || loading || !playlistReady) {
    return (
      <View style={styles.loadingContainer}>
        <Header />
        <LottieView source={loadingAnimation} autoPlay loop style={{ width: 150, height: 150 }} />
        <Text style={{ color: '#ccc', marginTop: 20 }}>Preparing your playlist...</Text>
        <Pressable onPress={() => setShowFeedback(true)} style={[styles.feedbackButton, { marginTop: 40 }]}>
          <Text style={styles.feedbackText}>End Session</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.fullScreen, { opacity: fadeAnim }]}>
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{name}, your playlist is ready! 🎧</Text>
        <Text style={styles.subtitle}>{selectedMood}</Text>
        <Text style={styles.label}>With your favorite artists:</Text>
        <Text style={styles.artists}>{favoriteArtistsDisplay}</Text>
        {playlistUrl ? (
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
        ) : (
          <Text style={{ color: '#888', textAlign: 'center', marginBottom: 20 }}>
            Playlist not available yet.
          </Text>
        )}
        <Pressable onPress={() => setShowFeedback(true)} style={styles.feedbackButton}>
          <Text style={styles.feedbackText}>End Session</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000' },
  moodPrompt: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  moodOption: { backgroundColor: 'rgba(0,0,0,0.45)', padding: 15, alignItems: 'center' },
  moodText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#000' },
  content: { flexGrow: 1, padding: 30, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  subtitle: { color: '#fff', fontSize: 20, textAlign: 'center', marginBottom: 20 },
  label: { color: '#ccc', fontSize: 16, textAlign: 'center' },
  artists: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 10, marginBottom: 40 },
  gradientButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignSelf: 'center' },
  gradientButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  feedbackButton: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignSelf: 'center' },
  feedbackText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  feedbackContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 30 },
  feedbackTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  feedbackSubtitle: { color: '#ccc', fontSize: 16, marginBottom: 30, textAlign: 'center' },
  feedbackOption: { backgroundColor: '#111', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  feedbackOptionText: { color: '#fff', fontSize: 16 },
});
