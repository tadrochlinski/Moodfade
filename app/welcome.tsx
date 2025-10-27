import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthProvider';
import { db } from '../utils/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import backgroundAnimation from '../assets/lottie/Background.json';

const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;
const redirectUri = AuthSession.makeRedirectUri();
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function WelcomeScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [favoriteArtists, setFavoriteArtists] = useState('');
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      const ref = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name ?? '');
        setFavoriteArtists(Array.isArray(data.favoriteArtists) ? data.favoriteArtists.join(', ') : '');
        setSpotifyConnected(data.spotifyConnected ?? false);
      }
    };
    loadUserData();
  }, [currentUser]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['user-read-email', 'user-read-private', 'playlist-modify-private'],
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      (async () => {
        try {
          setLoading(true);
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            { clientId, code, redirectUri, extraParams: { code_verifier: request?.codeVerifier! } },
            discovery
          );

          const accessToken = tokenResponse.accessToken;
          const refreshToken = tokenResponse.refreshToken;
          await SecureStore.setItemAsync('spotify_token', accessToken);
          if (refreshToken) await SecureStore.setItemAsync('spotify_refresh_token', refreshToken);

          const spotifyRes = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
          const spotifyData = await spotifyRes.json();

          await setDoc(
            doc(db, 'users', currentUser!.uid),
            {
              spotifyConnected: true,
              spotifyId: spotifyData.id,
              spotifyDisplayName: spotifyData.display_name,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          setSpotifyConnected(true);
          Alert.alert('Spotify Connected 🎧', `Connected as ${spotifyData.display_name}`);
        } catch {
          Alert.alert('Spotify Error', 'Failed to connect your Spotify account.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [response]);

  const isFormValid = name.trim().length > 0 && favoriteArtists.trim().length > 0 && spotifyConnected;

  const handleSubmit = async () => {
    if (!currentUser) return Alert.alert('Error', 'No user is logged in.');
    if (!isFormValid) return Alert.alert('Incomplete', 'Please fill in all fields and connect Spotify.');

    const artistsArray = favoriteArtists.split(',').map((a) => a.trim()).filter((a) => a.length > 0);

    try {
      setLoading(true);
      await setDoc(
        doc(db, 'users', currentUser.uid),
        { name, favoriteArtists: artistsArray, spotifyConnected, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      router.replace('/mood');
    } catch {
      Alert.alert('Error', 'Failed to save your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
      <Text style={styles.title}>Welcome to Moodfade!</Text>
      <Text style={styles.subtitle}>{spotifyConnected ? 'Spotify connected 🎧' : 'Fill in your details and connect Spotify'}</Text>

      <View style={styles.form}>
        <TextInput placeholder="Your name" placeholderTextColor="#888" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          placeholder="Favorite artists e.g. Coldplay, Bon Iver"
          placeholderTextColor="#888"
          value={favoriteArtists}
          onChangeText={setFavoriteArtists}
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator color="#1DB954" size="large" style={{ marginTop: 20 }} />
        ) : (
          <>
            <Pressable onPress={() => promptAsync()} disabled={spotifyConnected} style={[styles.spotifyButton, spotifyConnected && { opacity: 0.6 }]}>
              <Text style={styles.spotifyButtonText}>
                {spotifyConnected ? 'Spotify Connected' : 'Connect Spotify'}
              </Text>
            </Pressable>

            <Pressable onPress={handleSubmit} disabled={!isFormValid} style={{ width: '100%', marginTop: 15 }}>
              <View style={[styles.secondaryButton, !isFormValid && { backgroundColor: '#555' }]}>
                <Text style={[styles.secondaryButtonText, !isFormValid && { color: '#999' }]}>
                  Save & Continue
                </Text>
              </View>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { color: '#ccc', fontSize: 16, textAlign: 'center', marginBottom: 30 },
  form: { width: '100%', maxWidth: 360, alignItems: 'center' },
  input: {
    width: '100%',
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    fontSize: 16,
  },
  spotifyButton: {
    width: '100%',
    backgroundColor: '#1DB954',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  spotifyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  secondaryButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
