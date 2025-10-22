import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import SpotifyButton from '../components/SpotifyButton';
import * as AuthSession from 'expo-auth-session';
import { useSpotify } from '../contexts/SpotifyContext';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import LottieView from 'lottie-react-native';
import backgroundAnimation from '../assets/lottie/Background.json';

const { width, height } = Dimensions.get('window');

const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;
const redirectUri = AuthSession.makeRedirectUri();

console.log('➡️ redirectUri used:', redirectUri);
console.log('➡️ client used:', clientId);

export default function LoginScreen() {
  const { token, setToken } = useSpotify();
  const router = useRouter();

  const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: [
        'user-read-private',
        'playlist-read-private',
        'playlist-modify-private',
        'playlist-modify-public',
      ],
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    if (token) {
      console.log('🔐 Token already exists, skipping login screen...');
      router.replace('/token');
    }
  }, [token]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;

      (async () => {
        try {
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId,
              code,
              redirectUri,
              extraParams: {
                code_verifier: request?.codeVerifier!,
              },
            },
            {
              tokenEndpoint: discovery.tokenEndpoint,
            }
          );

          await SecureStore.setItemAsync('spotify_token', tokenResponse.accessToken);
          setToken(tokenResponse.accessToken);
          router.push('/token');
        } catch (error) {
          console.error('Token exchange failed:', error);
        }
      })();
    }
  }, [response, request, setToken, router, discovery.tokenEndpoint]);

  return (
    <View style={styles.container}>
      {/* 🎥 Background animation */}
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />

      <Image source={require('../assets/moodfade_banner.png')} style={styles.banner} resizeMode="contain" />
      <SpotifyButton onPress={() => promptAsync()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    width: 300,
    height: 200,
    marginBottom: 40,
  },
});
