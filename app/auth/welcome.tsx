import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthProvider";
import { db } from "../../utils/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import LottieView from "lottie-react-native";
import backgroundAnimation from "../../assets/lottie/Background.json";

const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;
const redirectUri = process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI!;
console.log("🎯 CLIENT ID (frontend):", process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID);
console.log("🎯 REDIRECT URI (frontend):", process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI);

console.log("REDIRECT URI USED WELCOME:", redirectUri);



const discovery = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

export default function WelcomeScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [favoriteArtists, setFavoriteArtists] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name ?? "");
        setFavoriteArtists(
          Array.isArray(data.favoriteArtists)
            ? data.favoriteArtists.join(", ")
            : "",
        );
        setSpotifyConnected(data.spotifyConnected ?? false);
      }
    };
    loadUserData();
  }, [currentUser]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: [
        "user-read-email",
        "user-read-private",
        "playlist-modify-private",
        "playlist-modify-public",
        "playlist-read-private",
        "playlist-read-collaborative",
      ],
      usePKCE: true,
    },
    discovery,
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      console.log("REDIRECT URI USED WELCOME:", redirectUri);
      (async () => {
        try {
          setSpotifyLoading(true);
          const backendRes = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/spotify/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                code_verifier: request?.codeVerifier!,
                redirect_uri: redirectUri
              }),

              
            },
          );

          const tokenResponse = await backendRes.json();

          if (!tokenResponse.access_token) {
            throw new Error("Backend token exchange failed");
          }

          const accessToken = tokenResponse.access_token;
          const refreshToken = tokenResponse.refresh_token;

          await SecureStore.setItemAsync("spotify_token", accessToken);
          if (refreshToken)
            await SecureStore.setItemAsync(
              "spotify_refresh_token",
              refreshToken,
            );

          const spotifyRes = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const spotifyData = await spotifyRes.json();

          await setDoc(
            doc(db, "users", currentUser!.uid),
            {
              spotifyConnected: true,
              spotifyId: spotifyData.id,
              spotifyDisplayName: spotifyData.display_name,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          setSpotifyConnected(true);
        } catch {
          Alert.alert(
            "Spotify Error",
            "Failed to connect your Spotify account.",
          );
        } finally {
          setSpotifyLoading(false);
        }
      })();
    }
  }, [response]);

  const isFormValid =
    name.trim().length > 0 &&
    favoriteArtists.trim().length > 0 &&
    spotifyConnected;

  const handleSubmit = async () => {
    if (!currentUser) return Alert.alert("Error", "No user is logged in.");
    if (!isFormValid)
      return Alert.alert(
        "Incomplete",
        "Please fill in all fields and connect Spotify.",
      );

    const artistsArray = favoriteArtists
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    try {
      setSaveLoading(true);
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          name,
          favoriteArtists: artistsArray,
          spotifyConnected,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      router.replace("/(tabs)/home" as any);
    } catch {
      Alert.alert("Error", "Failed to save your profile.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={backgroundAnimation}
        autoPlay
        loop
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={{ opacity: fadeAnim, width: "100%", alignItems: "center" }}
      >
        <Text style={styles.title}>Welcome to Moodfade!</Text>
        <Text style={styles.subtitle}>
          Fill in your details and connect Spotify
        </Text>

        <View style={styles.form}>
          <View style={styles.cardInput}>
            <TextInput
              placeholder="Your name"
              placeholderTextColor="#bbb"
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
              importantForAutofill="no"
              secureTextEntry={false}
            />
          </View>
          <View style={styles.cardInput}>
            <TextInput
              placeholder="Favorite artists e.g. Coldplay, Bon Iver"
              placeholderTextColor="#bbb"
              value={favoriteArtists}
              onChangeText={setFavoriteArtists}
              style={styles.input}
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
              importantForAutofill="no"
              autoCapitalize="none"
              secureTextEntry={false}
            />
          </View>

          <Pressable
            onPress={() => promptAsync()}
            disabled={spotifyConnected || spotifyLoading}
            style={[
              styles.spotifyButton,
              (spotifyConnected || spotifyLoading) && { opacity: 0.7 },
            ]}
          >
            {spotifyLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.spotifyButtonText}>
                {spotifyConnected ? "Spotify Connected" : "Connect Spotify"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid || saveLoading}
            style={{ width: "100%", marginTop: 15 }}
          >
            <View
              style={[
                styles.whiteButton,
                (!isFormValid || saveLoading) && { opacity: 0.7 },
              ]}
            >
              {saveLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.whiteButtonText}>Save & Continue</Text>
              )}
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  form: { width: "100%", maxWidth: 360, alignItems: "center" },
  cardInput: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginVertical: 8,
    paddingHorizontal: 14,
  },
  input: {
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
  },
  spotifyButton: {
    width: "100%",
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#1DB954",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  spotifyButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  whiteButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  whiteButtonText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
