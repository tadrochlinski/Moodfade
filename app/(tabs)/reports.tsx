import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { useUser } from "../../contexts/UserContext";
import { useSpotify } from "../../contexts/SpotifyContext";
import { auth, db } from "../../utils/firebaseConfig";
import backgroundAnimation from "../../assets/lottie/Background.json";

interface SessionDoc {
  id: string;
  mood: string;
  feedback: string | null;
  likedTracks: string[];
  dislikedTracks: string[];
  createdAt: Date | null;
}

// ---------- HOOK ----------
function useUserSessions(maxSessions = 100) {
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(maxSessions)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: SessionDoc[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            mood: d.mood,
            feedback: d.feedback ?? null,
            likedTracks: d.likedTracks ?? [],
            dislikedTracks: d.dislikedTracks ?? [],
            createdAt: d.createdAt?.toDate?.() ?? null,
          };
        });
        console.log("📡 Loaded sessions:", data.length);
        setSessions(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to sessions:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { sessions, loading };
}

// ---------- STATS ----------
function buildStats(sessions: SessionDoc[]) {
  const moodCounts: Record<string, number> = {};
  const moodFeedback: Record<string, Record<string, number>> = {};
  const liked: Record<string, number> = {};
  const disliked: Record<string, number> = {};

  for (const s of sessions) {
    if (s.mood) {
      moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1;
      if (s.feedback) {
        const fb = (moodFeedback[s.mood] = moodFeedback[s.mood] || {});
        fb[s.feedback] = (fb[s.feedback] || 0) + 1;
      }
    }
    for (const key of s.likedTracks || []) liked[key] = (liked[key] || 0) + 1;
    for (const key of s.dislikedTracks || []) disliked[key] = (disliked[key] || 0) + 1;
  }

  console.log("📊 Stats built:", {
    moods: Object.keys(moodCounts).length,
    liked: Object.keys(liked).length,
    disliked: Object.keys(disliked).length,
  });

  return { moodCounts, moodFeedback, liked, disliked };
}

function pickRecommendedMood(moodFeedback: Record<string, Record<string, number>>) {
  let bestMood: string | null = null;
  let bestScore = -Infinity;

  for (const [mood, fb] of Object.entries(moodFeedback)) {
    const vp = fb["Very Positive"] || 0;
    const p = fb["Positive"] || 0;
    const n = fb["Negative"] || 0;
    const vn = fb["Very Negative"] || 0;
    const total = vp + p + n + vn;
    if (!total) continue;
    const score = (2 * vp + p - n - 2 * vn) / total;
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood;
    }
  }

  return bestMood;
}

function formatTrackKey(key: string) {
  const [title, author] = key.split("__");
  return { title, author };
}

// ---------- MAIN COMPONENT ----------
export default function Reports() {
  const { userData } = useUser();
  const { token: spotifyToken } = useSpotify();
  const name = userData?.name || "Friend";
  const photoBase64 = userData?.photoBase64 ?? "";
  const avatarUrl =
    photoBase64 && photoBase64.length > 0
      ? photoBase64
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name
        )}&background=444&color=fff&size=128`;

  const { sessions, loading } = useUserSessions();
  const stats = useMemo(() => buildStats(sessions), [sessions]);
  const recommendedMood = useMemo(() => pickRecommendedMood(stats.moodFeedback), [stats]);
  const [targetMood, setTargetMood] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [trackCovers, setTrackCovers] = useState<Record<string, string>>({});

  // Fetch cover art
  useEffect(() => {
    if (!spotifyToken || sessions.length === 0) return;

    const fetchCover = async (title: string, author: string, key: string) => {
      if (trackCovers[key]) return;
      try {
        const q = encodeURIComponent(`track:${title} artist:${author}`);
        const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
          headers: { Authorization: `Bearer ${spotifyToken}` },
        });
        const data = await res.json();
        const img = data.tracks?.items?.[0]?.album?.images?.[0]?.url;
        if (img) setTrackCovers((prev) => ({ ...prev, [key]: img }));
      } catch (err) {
        console.warn("Spotify cover fetch error:", err);
      }
    };

    const fetchCoversFor = async (entries: Record<string, number>) => {
      const keys = Object.keys(entries).slice(0, 10);
      for (const key of keys) {
        const { title, author } = formatTrackKey(key);
        await fetchCover(title, author, key);
      }
    };

    Promise.all([fetchCoversFor(stats.liked), fetchCoversFor(stats.disliked)]).then(() => {
      console.log("🎨 Finished fetching covers");
    });
  }, [spotifyToken, sessions]);

  // ---------- Target mood ----------
  useEffect(() => {
    const fetchTargetMood = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);
        const data = snap.data();
        if (data?.targetMood) setTargetMood(data.targetMood);
      } catch (err) {
        console.error("Error loading target mood:", err);
      }
    };
    fetchTargetMood();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const totalMoods = Object.values(stats.moodCounts).reduce((a, b) => a + b, 0);

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.userName}>{name}</Text>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
    </View>
  );

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ---------- UI ----------
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
      <Header />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Your Mood Report</Text>

          {loading && sessions.length === 0 ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
          ) : sessions.length === 0 ? (
            <Text style={styles.emptyText}>
              Start your first session to see detailed reports about your moods and music!
            </Text>
          ) : (
            <>
              {/* Target mood */}
              {targetMood && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Target mood progress</Text>
                  <Text style={styles.cardSubtitle}>
                    You’re aligned with your goal mood{" "}
                    <Text style={styles.highlight}>{targetMood}</Text>.
                  </Text>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={["#6C63FF", "#00C6FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: "60%" }]}
                    />
                  </View>
                </View>
              )}

              {/* Recommended mood */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recommended mood</Text>
                {recommendedMood ? (
                  <Text style={styles.cardSubtitle}>
                    You usually feel best after listening to{" "}
                    <Text style={styles.highlight}>{recommendedMood}</Text> sessions.
                  </Text>
                ) : (
                  <Text style={styles.cardSubtitle}>
                    Not enough feedback yet. Finish a few sessions to get insights.
                  </Text>
                )}
              </View>

              {/* Top moods */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top moods</Text>
                {totalMoods === 0 ? (
                  <Text style={styles.cardSubtitle}>No sessions yet.</Text>
                ) : (
                  Object.entries(stats.moodCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([mood, count]) => {
                      const pct = Math.round((count / totalMoods) * 100);
                      return (
                        <View key={mood} style={{ marginTop: 10 }}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.moodText}>{mood}</Text>
                            <Text style={styles.moodCount}>
                              {count} • {pct}%
                            </Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <LinearGradient
                              colors={["#6C63FF", "#00C6FF"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.progressBarFill, { width: `${pct}%` }]}
                            />
                          </View>
                        </View>
                      );
                    })
                )}
              </View>

              {/* Most liked tracks */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Most liked tracks</Text>
                {Object.entries(stats.liked)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([key, count]) => {
                    const { title, author } = formatTrackKey(key);
                    const cover = trackCovers[key];
                    return (
                      <View key={key} style={styles.trackRow}>
                        {cover ? (
                          <Image source={{ uri: cover }} style={styles.trackImage} />
                        ) : (
                          <LinearGradient colors={["#222", "#333"]} style={styles.trackImage} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackTitle}>{title}</Text>
                          <Text style={styles.trackAuthor}>{author}</Text>
                          <Text style={styles.trackStat}>Liked {count} times</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>

              {/* Most skipped tracks */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Most disliked tracks</Text>
                {Object.entries(stats.disliked)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([key, count]) => {
                    const { title, author } = formatTrackKey(key);
                    const cover = trackCovers[key];
                    return (
                      <View key={key} style={styles.trackRow}>
                        {cover ? (
                          <Image source={{ uri: cover }} style={styles.trackImage} />
                        ) : (
                          <LinearGradient colors={["#333", "#111"]} style={styles.trackImage} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackTitle}>{title}</Text>
                          <Text style={styles.trackAuthor}>{author}</Text>
                          <Text style={styles.trackStat}>Disliked {count} times</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>

              {/* Session history */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Session history</Text>
                {sessions.slice(0, 6).map((s) => (
                  <View key={s.id} style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionMood}>{s.mood || "Unknown mood"}</Text>
                      <Text style={styles.sessionDate}>{formatDate(s.createdAt)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.sessionFeedback,
                        {
                          color:
                            s.feedback === "Very Positive"
                              ? "#4AFF8A"
                              : s.feedback === "Positive"
                              ? "#A7FFEB"
                              : s.feedback === "Negative"
                              ? "#FFA07A"
                              : s.feedback === "Very Negative"
                              ? "#FF5C5C"
                              : "#aaa",
                        },
                      ]}
                    >
                      {s.feedback || "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 100, paddingBottom: 60 },
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 30,
    textAlign: "center",
  },
  emptyText: { color: "#ccc", textAlign: "center", marginTop: 40, fontSize: 16 },
  card: {
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 10 },
  cardSubtitle: { color: "#f2f2f2", fontSize: 14, lineHeight: 20 },
  highlight: { color: "#7B78FF", fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  moodText: { color: "#fff", fontWeight: "500" },
  moodCount: { color: "#aaa" },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginTop: 6,
  },
  progressBarFill: { height: "100%", borderRadius: 3 },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 12,
  },
  trackImage: { width: 52, height: 52, borderRadius: 8 },
  trackTitle: { color: "#fff", fontWeight: "500" },
  trackAuthor: { color: "#ccc", fontSize: 13 },
  trackStat: { color: "#7B78FF", fontSize: 12 },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  sessionInfo: {},
  sessionMood: { color: "#fff", fontWeight: "500" },
  sessionDate: { color: "#aaa", fontSize: 12 },
  sessionFeedback: { fontWeight: "600", fontSize: 13 },
});
