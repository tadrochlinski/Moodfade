import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import * as SecureStore from "expo-secure-store";
import { useUser } from "../../contexts/UserContext";
import { useSpotify } from "../../contexts/SpotifyContext";
import useMoodSongs from "../../hooks/useMoodSongs";
import { db, auth } from "../../utils/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import loadingAnimation from "../../assets/lottie/loading.json";
import backgroundAnimation from "../../assets/lottie/Background.json";

const moodOptions = [
  {
    label: "Positive & Uplifting",
    emoji: "😊",
    colors: ["#FF9A9E", "#FAD0C4"],
  },
  { label: "Romantic & Sensual", emoji: "💖", colors: ["#FAD0C4", "#FFD1FF"] },
  { label: "Energetic & Intense", emoji: "🔥", colors: ["#FF6E7F", "#BFE9FF"] },
  { label: "Calm & Reflective", emoji: "🌙", colors: ["#667EEA", "#764BA2"] },
  { label: "Melancholic & Dark", emoji: "🌧️", colors: ["#232526", "#414345"] },
  {
    label: "Unconventional & Playful",
    emoji: "🎭",
    colors: ["#FDC830", "#F37335"],
  },
];

const feedbackOptions = [
  "Very Positive",
  "Positive",
  "Neutral",
  "Negative",
  "Very Negative",
];

export default function HomeScreen() {
  const { userData } = useUser();
  const { token, refreshToken, loading: spotifyLoading } = useSpotify();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [listeningMode, setListeningMode] = useState<
    "current" | "regulation" | null
  >(null); 
  const [playlistReady, setPlaylistReady] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [showTrackFeedback, setShowTrackFeedback] = useState(false);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [dislikedTracks, setDislikedTracks] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const name = userData?.name || "Friend";
  const photoBase64 = userData?.photoBase64 ?? "";
  const targetMood = userData?.targetMood ?? null;
  const avatarUrl =
    photoBase64 && photoBase64.length > 0
      ? photoBase64
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name,
        )}&background=444&color=fff&size=128`;

  const rawArtists = Array.isArray(userData?.favoriteArtists)
    ? userData.favoriteArtists
    : typeof userData?.favoriteArtists === "string"
      ? [userData.favoriteArtists]
      : [];

  const { tracks, loading } = useMoodSongs(
    selectedMood,
    targetMood,
    listeningMode ?? null, 
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (showTrackFeedback && tracks.length > 0) {
      const initialLiked = tracks
        .slice(0, 8)
        .map((t) => `${t.title}__${t.author}__${t.imageUrl || "noimg"}`);
      setLikedTracks(initialLiked);
    }
  }, [showTrackFeedback, tracks]);

  useEffect(() => {
  }, [tracks]);

  useEffect(() => {
    let cancelled = false;

    async function syncPlaylist() {
      if (!selectedMood || !token || loading || !tracks || tracks.length === 0)
        return;
      let validToken = token;

      try {
        const testRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        if (testRes.status === 401) {
          await refreshToken();
          const newToken = await SecureStore.getItemAsync("spotify_token");
          if (!newToken) return;
          validToken = newToken;
        }

        const userRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        const user = await userRes.json();

        let playlists: any[] = [];
        let nextUrl = `https://api.spotify.com/v1/me/playlists?limit=50`;
        console.log("➡️  Fetching playlists from:", nextUrl);

        while (nextUrl) {
          const pageRes = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${validToken}` },
          });
          const pageData = await pageRes.json();

          playlists.push(...(pageData.items ?? []));
          nextUrl = pageData.next;
        }

        console.log("📀 Total playlists fetched:", playlists.length);
        playlists.forEach((p: any, i: number) => {
          console.log(
            `  #${i + 1}: name="${p.name}", id=${p.id}, owner=${p.owner?.id}, visibility=${p.public}`,
          );
        });

        const moodfadePlaylists = playlists.filter(
          (p: any) => p.name?.toLowerCase() === "moodfade",
        );

        console.log("🔎 Moodfade candidates:", moodfadePlaylists.length);

        moodfadePlaylists.forEach((p: any, i: number) => {
          console.log(
            `  MF #${i + 1}: id=${p.id}, name="${p.name}", owner=${p.owner?.id}, uri=${p.uri}`,
          );
        });

        const moodfadePlaylist = moodfadePlaylists.find((p) => !!p.id) || null;

        console.log(
          "🎯 Selected playlist:",
          moodfadePlaylist ? moodfadePlaylist.id : "NONE",
        );

        if (moodfadePlaylists.length > 0 && !moodfadePlaylist) {
          console.log(
            "❗ ALERT: Moodfade exists but ALL entries have null/invalid ID",
          );
        }

        if (moodfadePlaylists.length > 1) {
          console.log(
            "⚠ Duplicate Moodfade detected (all IDs):",
            moodfadePlaylists.map((p) => p.id),
          );
        }

        let playlistId = moodfadePlaylist?.id;
        let foundPlaylistUrl = moodfadePlaylist?.external_urls?.spotify;

        if (!playlistId) {
          const createRes = await fetch(
            `https://api.spotify.com/v1/users/${user.id}/playlists`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${validToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: "Moodfade",
                description: "Your Moodfade playlist",
                public: false,
              }),
            },
          );
          const created = await createRes.json();
          console.log("🆕 Created new Moodfade playlist:", created);

          playlistId = created.id;

          foundPlaylistUrl = created.external_urls?.spotify;
        }

        if (foundPlaylistUrl) setPlaylistUrl(foundPlaylistUrl);

        const uris: string[] = [];
        const fav = rawArtists.filter((a) => a && a.length > 0);

        for (const artist of fav) {
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(
              artist,
            )}&type=track&limit=3`,
            { headers: { Authorization: `Bearer ${validToken}` } },
          );
          const data = await res.json();
          data.tracks?.items?.forEach((track: any) =>
            uris.push(`spotify:track:${track.id}`),
          );
          if (cancelled) return;
        }

        for (const track of tracks) {
          const query = `track:${track.title} artist:${track.author}`;
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(
              query,
            )}&type=track&limit=1`,
            { headers: { Authorization: `Bearer ${validToken}` } },
          );
          const data = await res.json();
          const found = data.tracks?.items?.[0];
          if (found) uris.push(`spotify:track:${found.id}`);
          if (cancelled) return;
        }

        if (playlistId && uris.length > 0) {
          console.log(
            "🎵 Updating playlist:",
            playlistId,
            "with",
            uris.length,
            "tracks",
          );

          const putRes = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${validToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ uris }),
            },
          );

          console.log("📡 PUT response status:", putRes.status);

          if (!putRes.ok) {
            const err = await putRes.text();
            console.log("❌ PUT ERROR:", err);
          }
        }

        setPlaylistReady(true);
      } catch {
        if (!cancelled) setPlaylistReady(false);
      }
    }

    syncPlaylist();
    return () => {
      cancelled = true;
    };
  }, [selectedMood, token, loading, tracks]);

  async function saveSession() {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert("Error", "User not authenticated.");

    try {
      await addDoc(collection(db, "sessions"), {
        userId: uid,
        mood: selectedMood,
        mode: listeningMode,
        targetMood: targetMood ?? null,
        feedback: selectedFeedback,
        likedTracks,
        dislikedTracks,
        createdAt: serverTimestamp(),
      });
      setSelectedMood(null);
      setListeningMode(null);
      setSelectedFeedback(null);
      setLikedTracks([]);
      setDislikedTracks([]);
      setShowFeedback(false);
      setShowTrackFeedback(false);
    } catch {
      Alert.alert("Error", "Could not save session.");
    }
  }

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.userName}>{name}</Text>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
    </View>
  );

  if (!selectedMood) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <LottieView
          source={backgroundAnimation}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
        />
        <Header />
        <View style={{ padding: 20 }}>
          <Text style={styles.moodPrompt}>What's your mood today?</Text>
          {moodOptions.map(({ label, emoji, colors }) => (
            <Pressable
              key={label}
              onPress={() => {
                if (label === targetMood) {
                  setSelectedMood(label);
                  setListeningMode("current");
                  setPlaylistReady(false);
                } else {
                  setSelectedMood(label);
                  setPlaylistReady(false);
                }
              }}
              style={{ marginBottom: 15 }}
            >
              <LinearGradient
                colors={colors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, overflow: "hidden" }}
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

  if (selectedMood && !listeningMode) {
    if (!targetMood) {
      setListeningMode("current");
      return null;
    }

    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <LottieView
          source={backgroundAnimation}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
        />
        <Header />

        <View style={{ alignItems: "center", paddingHorizontal: 25 }}>
          <Text style={styles.modeTitle}>Let's shape your mood today</Text>

          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.65)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
              borderRadius: 22,
              paddingVertical: 28,
              paddingHorizontal: 20,
              width: "90%",
              alignItems: "center",
              marginTop: 50,
              shadowColor: "#000",
              shadowOpacity: 0.5,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={styles.modePrompt}>
              Do you want to stay in your current mood or work towards your
              target mood?
            </Text>

            <Pressable
              onPress={() => setListeningMode("current")}
              style={[styles.modeButtonWhite, { marginTop: 25 }]}
            >
              <Text style={styles.modeButtonWhiteText}>Stay in this mood</Text>
            </Pressable>

            <Pressable
              onPress={() => setListeningMode("regulation")}
              style={[styles.modeButton, { marginTop: 0 }]}
            >
              <LinearGradient
                colors={["#7B78FF", "#00C6FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modeButtonInner}
              >
                <Text style={[styles.modeButtonText, { color: "#fff" }]}>
                  Regulate my mood
                </Text>
              </LinearGradient>
            </Pressable>

            <Text style={[styles.modePrompt, { marginTop: 15 }]}>
              Music will guide you gently.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!selectedMood) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <LottieView
          source={backgroundAnimation}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
        />
        <Header />
        <View style={{ padding: 20 }}>
          <Text style={styles.moodPrompt}>What's your mood today?</Text>
          {moodOptions.map(({ label, emoji, colors }) => (
            <Pressable
              key={label}
              onPress={() => {
                setSelectedMood(label);
                setPlaylistReady(false);
              }}
              style={{ marginBottom: 15 }}
            >
              <LinearGradient
                colors={colors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, overflow: "hidden" }}
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

  if (showFeedback) {
    return (
      <View style={styles.feedbackContainer}>
        <LottieView
          source={backgroundAnimation}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
        />
        <Header />

        <Text style={styles.feedbackTitle}>How do you feel?</Text>
        <Text style={styles.feedbackSubtitle}>
          Let us know how the music made you feel
        </Text>

        <View style={{ width: "90%", alignItems: "center", marginTop: 10 }}>
          {feedbackOptions.map((option) => {
            const isSelected = selectedFeedback === option;
            return (
              <Pressable
                key={option}
                onPress={() => setSelectedFeedback(option)}
                style={[
                  styles.feedbackOptionCard,
                  isSelected && { borderColor: "#00C6FF", borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.feedbackOptionText,
                    isSelected && { color: "#00C6FF", fontWeight: "700" },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            onPress={() => {
              if (!selectedFeedback)
                return Alert.alert("Please select how you feel.");
              setShowFeedback(false);
              setShowTrackFeedback(true);
            }}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={["#7B78FF", "#00C6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButtonUnified}
            >
              <Text style={styles.gradientButtonText}>Next</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => {
              setShowFeedback(false);
              setSelectedFeedback(null);
            }}
            style={styles.whiteButtonUnified}
          >
            <Text style={styles.whiteButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (showTrackFeedback) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <LottieView
          source={backgroundAnimation}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
        />
        <Header />
        <ScrollView
          contentContainerStyle={{
            paddingTop: 100,
            paddingBottom: 50,
            alignItems: "center",
          }}
        >
          <Text style={styles.feedbackTitle}>Which tracks stood out?</Text>
          <Text style={styles.feedbackSubtitle}>Toggle to like or dislike</Text>

          {tracks.slice(0, 8).map((track) => {
            const key = `${track.title}__${track.author}__${track.imageUrl || "noimg"}`;
            const liked = likedTracks.includes(key);
            const disliked = dislikedTracks.includes(key);
            return (
              <View
                key={key}
                style={{
                  width: "90%",
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  borderRadius: 16,
                  padding: 12,
                  marginVertical: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                {track.imageUrl ? (
                  <Image
                    source={{ uri: track.imageUrl }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  />
                ) : (
                  <LinearGradient
                    colors={["#222", "#333"]}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  <Text
                    style={{ color: "#aaa", fontSize: 14 }}
                    numberOfLines={1}
                  >
                    {track.author}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (liked) {
                      setLikedTracks((prev) => prev.filter((t) => t !== key));
                      setDislikedTracks((prev) => [...prev, key]);
                    } else if (disliked) {
                      setDislikedTracks((prev) =>
                        prev.filter((t) => t !== key),
                      );
                      setLikedTracks((prev) => [...prev, key]);
                    } else {
                      setLikedTracks((prev) => [...prev, key]);
                    }
                  }}
                >
                  <LinearGradient
                    colors={
                      liked
                        ? ["#00ff88", "#00c3ff"]
                        : disliked
                          ? ["#ff4d4d", "#cc0000"]
                          : ["#333", "#444"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: 50,
                      height: 26,
                      borderRadius: 13,
                      justifyContent: "center",
                      padding: 3,
                      alignItems: liked
                        ? "flex-end"
                        : disliked
                          ? "flex-start"
                          : "center",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "#000",
                      }}
                    />
                  </LinearGradient>
                </Pressable>
              </View>
            );
          })}

          <Pressable
            onPress={saveSession}
            style={[styles.feedbackButton, { width: "70%", marginTop: 30 }]}
          >
            <Text style={styles.feedbackText}>Save Session</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (spotifyLoading || loading || !playlistReady) {
    return (
      <View style={styles.loadingContainer}>
        <Header />
        <LottieView
          source={loadingAnimation}
          autoPlay
          loop
          style={{ width: 150, height: 150 }}
        />
        <Text style={{ color: "#ccc", marginTop: 20 }}>
          Preparing your playlist...
        </Text>

        {listeningMode === "regulation" && targetMood && selectedMood && (
          <Text
            style={{
              color: "#afafafff",
              marginTop: 20,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            We’ll help you shift from feeling {selectedMood.toLowerCase()} to
            feeling more {targetMood.toLowerCase()}. Just listen and let it
            flow.
          </Text>
        )}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.fullScreen, { opacity: fadeAnim }]}>
      <LottieView
        source={backgroundAnimation}
        autoPlay
        loop
        style={StyleSheet.absoluteFill}
      />
      <Header />

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={{
            backgroundColor: "rgba(0,0,0,0.65)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
            borderRadius: 22,
            paddingVertical: 40,
            paddingHorizontal: 25,
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.5,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Text style={styles.readyTitle}>{name}, your playlist is ready</Text>

          {listeningMode === "regulation" && targetMood && (
            <Text style={styles.readyHint}>
              Helping you move from{" "}
              <Text style={styles.highlight}>{selectedMood}</Text> to{" "}
              <Text style={styles.highlight}>{targetMood}</Text>
            </Text>
          )}

          <Text style={styles.readyMood}>{selectedMood}</Text>

          <Text style={styles.label}>Featuring:</Text>
          <Text style={styles.artists}>
            {rawArtists.length > 0
              ? `${rawArtists[0]}${rawArtists.length > 1 ? " and more" : ""}`
              : "your favorite artists"}
          </Text>
          
          <View style={styles.actionButtons}>
            {playlistUrl ? (
              <Pressable
                onPress={() => Linking.openURL(playlistUrl)}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={["#7B78FF", "#00C6FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButtonUnified}
                >
                  <Text style={styles.gradientButtonText}>Open in Spotify</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Text
                style={{ color: "#888", textAlign: "center", marginTop: 10 }}
              >
                Playlist not available yet.
              </Text>
            )}

            <Pressable
              onPress={() => setShowFeedback(true)}
              style={styles.whiteButtonUnified}
            >
              <Text style={styles.whiteButtonText}>End Session</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: "#000" },
  moodPrompt: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  moodOption: {
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 15,
    alignItems: "center",
  },
  moodText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 50,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#000",
  },
  content: { flexGrow: 1, padding: 30, justifyContent: "center" },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  subtitle: {
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  label: { color: "#ccc", fontSize: 16, textAlign: "center" },
  artists: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  feedbackButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  feedbackContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  feedbackTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  feedbackSubtitle: {
    color: "#ccc",
    fontSize: 15,
    marginBottom: 25,
    textAlign: "center",
  },
  feedbackOption: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  feedbackOptionText: { color: "#fff", fontSize: 16 },
  modeTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 60,
  },
  modePrompt: {
    color: "#e0e0e0",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  modeButton: {
    width: "90%",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  modeButtonInner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 50,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  modeHint: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 25,
  },
  readyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  readyHint: {
    color: "#ccc",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  highlight: {
    color: "#7B78FF",
    fontWeight: "600",
  },
  readyMood: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 25,
    textAlign: "center",
  },
  spotifyButton: {
    width: "80%",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#00C6FF",
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  spotifyButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  endSessionButton: {
    width: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 12,
    marginTop: 25,
    alignItems: "center",
  },
  endSessionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modeButtonWhite: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 25,
    shadowColor: "#fff",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modeButtonWhiteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  actionButtons: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  buttonWrapper: {
    width: "80%",
    marginBottom: 15,
  },
  gradientButtonUnified: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00C6FF",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  whiteButtonUnified: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  whiteButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  feedbackOptionCard: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});
