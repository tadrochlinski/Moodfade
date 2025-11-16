import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import LottieView from "lottie-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import backgroundAnimation from "../../assets/lottie/Background.json";
import { useSpotify } from "../../contexts/SpotifyContext";
import { useUser } from "../../contexts/UserContext";
import { auth, db } from "../../utils/firebaseConfig";

interface SessionDoc {
  id: string;
  mood: string;
  mode: "current" | "regulation" | null;
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
            mode: d.mode ?? null,
            feedback: d.feedback ?? null,
            likedTracks: d.likedTracks ?? [],
            dislikedTracks: d.dislikedTracks ?? [],
            createdAt: d.createdAt?.toDate?.() ?? null,
          };
        });
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

// ---------- FIBONACCI EMA TREND SCORE ----------
function calculateTrendScore(
  sessions: SessionDoc[],
  targetMood: string | null,
  targetMoodChangedAt: Date | null
) {
  if (!targetMood) {
    console.log("⚠️ No target mood → trendScore = null");
    return null;
  }

  console.log("📈 Calculating Fibonacci EMA Trend Score for targetMood:", targetMood);

  const weightMap: Record<string, number> = {
    "Very Positive": 3,
    "Positive": 2,
    "Neutral": 1,
    "Negative": -2,
    "Very Negative": -3,
  };

  // Pick only relevant attempts
  const attempts = sessions.filter((s) => {
  const meetsTime =
    !targetMoodChangedAt ||
    (!s.createdAt || s.createdAt >= targetMoodChangedAt);

  const isAttempt =
    (
      s.mode === "regulation" &&
      meetsTime
    ) ||
    (
      s.mode === "current" &&
      s.mood === targetMood &&
      meetsTime
    );

  return isAttempt && s.feedback;
});


  console.log("🧪 Total ATTEMPTS detected:", attempts.length);

  attempts.forEach((s, i) => {
    console.log(`   • Attempt #${i + 1}`, {
      id: s.id,
      mode: s.mode,
      mood: s.mood,
      feedback: s.feedback,
      weight: weightMap[s.feedback || "Neutral"],
      createdAt: s.createdAt?.toISOString?.() ?? null,
    });
  });

  if (attempts.length === 0) {
    console.log("⚠️ No attempts → trendScore = null");
    return null;
  }

  // Only last 12
  const recent = attempts.slice(0, 12);
  console.log(`📉 Using last ${recent.length} attempts (max 12).`);

  const values = recent.map((s) => weightMap[s.feedback || "Neutral"]);
  console.log("🔢 Numerical weights for EMA:", values);

  const N = values.length;
  const alpha = 2 / (N + 1);
  console.log("⚙️ EMA alpha:", alpha);

  // EMA calculation
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }

  console.log("📊 Raw EMA result:", ema);

  // Normalize -3..3 → 0..100
  const normalized = (ema - (-3)) / 6;
  const score = Math.round(normalized * 100);

  console.log("🎯 Final normalized Trend Score (before confidence):", score);

  // ------------------------------------
  // CONFIDENCE SCALING
  // ------------------------------------
  // grows from 0 → 1 as attempts go from 0 → 6
  const confidence = Math.min(1, attempts.length / 6);

  console.log("🧠 Confidence factor:", confidence);

  const adjusted = Math.round(score * confidence);

  console.log("📉 Adjusted Trend Score (with confidence):", adjusted);

  return Math.max(0, Math.min(100, adjusted));

}



// ---------- BUILD STATS ----------
function buildStats(
  sessions: SessionDoc[],
  userTargetMood: string | null,
  targetMoodChangedAt: Date | null
) {
  console.log("🧮 buildStats() called with targetMood =", userTargetMood);
  console.log("🧾 Sessions passed in:", sessions.length);

  const moodCounts: Record<string, number> = {};
  const moodFeedback: Record<string, Record<string, number>> = {};
  const liked: Record<string, number> = {};
  const disliked: Record<string, number> = {};

  for (const s of sessions) {
    console.log("🔍 Session:", {
      id: s.id,
      mood: s.mood,
      mode: s.mode,
      feedback: s.feedback,
      createdAt: s.createdAt?.toISOString?.() ?? null,
    });

    // --- Stats for top moods etc ---
    if (s.mood) {
      moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1;

      if (s.feedback) {
        const fb = (moodFeedback[s.mood] = moodFeedback[s.mood] || {});
        fb[s.feedback] = (fb[s.feedback] || 0) + 1;
      }
    }

    // --- Determine if this session is an ATTEMPT (counts into denominator) ---
    const isAttempt =
    (
      s.mode === "regulation" &&
      (targetMoodChangedAt ? s.createdAt && s.createdAt >= targetMoodChangedAt : true)
    ) ||
    (
      s.mode === "current" &&
      userTargetMood &&
      s.mood === userTargetMood &&
      (targetMoodChangedAt ? s.createdAt && s.createdAt >= targetMoodChangedAt : true)
    );




    // Track likes/dislikes
    for (const key of s.likedTracks || []) liked[key] = (liked[key] || 0) + 1;
    for (const key of s.dislikedTracks || []) disliked[key] = (disliked[key] || 0) + 1;

    console.log("📌 Attempt summary done — now computing trendScore...");
  }

  console.log("📊 buildStats() SUMMARY:", {
    targetMood: userTargetMood,
    totalSessions: sessions.length,
    moodCounts,
    likedCount: Object.keys(liked).length,
    dislikedCount: Object.keys(disliked).length,
  });

  const trendScore = calculateTrendScore(
    sessions,
    userTargetMood,
    targetMoodChangedAt
  );


  return {
    moodCounts,
    moodFeedback,
    liked,
    disliked,
    trendScore,
  };

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
  const targetMoodChangedAt = userData?.targetMoodChangedAt ?? null;

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
  const [targetMood, setTargetMood] = useState<string | null>(null);
  useEffect(() => {
  console.log("🎯 targetMood state changed:", targetMood);
  }, [targetMood]);

  const stats = useMemo(
    () => buildStats(sessions, targetMood, targetMoodChangedAt),
    [sessions, targetMood, targetMoodChangedAt]
  ) ;


  
  const recommendedMood = useMemo(() => pickRecommendedMood(stats.moodFeedback), [stats]);

  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [trackCovers, setTrackCovers] = useState<Record<string, string>>({});


  // ---------- Load user's target mood ----------
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const docRef = doc(db, "users", uid);

    const unsub = onSnapshot(docRef, (snap) => {
      const data = snap.data();
      setTargetMood(data?.targetMood ?? null);
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    return () => unsub();
  }, []);

  // ---------- Fetch cover art ----------
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

    Promise.all([fetchCoversFor(stats.liked), fetchCoversFor(stats.disliked)]);
  }, [spotifyToken, sessions]);

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
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your Mood Report</Text>

          {loading && sessions.length === 0 ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
          ) : sessions.length === 0 ? (
            <Text style={styles.emptyText}>
              Start your first session to see detailed reports about your moods and music!
            </Text>
          ) : (
            <>
              {/* Target mood progress */}
              {targetMood && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Target mood progress</Text>

                  {stats.trendScore == null ? (
                    <Text style={styles.cardSubtitle}>
                      Complete a session while working toward your target mood to begin building your trend.
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.cardSubtitle}>
                        Your emotional trend toward{" "}
                        <Text style={styles.highlight}>{targetMood}</Text>:
                      </Text>

                      <Text style={styles.progressNumber}>{stats.trendScore}%</Text>

                      <View style={styles.progressBarBg}>
                        <LinearGradient
                          colors={["#6C63FF", "#00C6FF"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressBarFill, { width: `${stats.trendScore}%` }]}
                        />
                      </View>
                    </>
                  )}
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

              {/* Most disliked tracks */}
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

              {/* ---------- LEFT SIDE (2 lines) ---------- */}
              <View style={{ flex: 1 }}>

                {/* LINE 1 — mood + feedback */}
                <View style={styles.rowBetween}>
                  <Text
                    style={styles.sessionMood}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {s.mood || "Unknown mood"}
                  </Text>

                  <Text
                    style={[
                      styles.sessionFeedback,
                      {
                        color:
                          s.feedback === "Very Positive"
                            ? "#7B78FF"        // jasny fiolet (premium)
                            : s.feedback === "Positive"
                            ? "#7B78FF"        // główny fiolet
                            : s.feedback === "Negative"
                            ? "#7B78FF"      // półprzezroczysty fiolet
                            : s.feedback === "Very Negative"
                            ? "#7B78FF"      // pastelowy “alert violet”
                            : "#7B78FF",          // neutral
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {s.feedback || "—"}
                  </Text>
                </View>

                {/* LINE 2 — date + tag */}
                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                  <Text style={styles.sessionDate}>{formatDate(s.createdAt)}</Text>

                  {s.mode === "regulation" ? (
                    <LinearGradient
                      colors={["#7B78FF55", "#00C6FF55"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tagRegulation}
                    >
                      <Text style={styles.tagText}>REGULATION</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tagCurrent}>
                      <Text style={styles.tagText}>CURRENT</Text>
                    </View>
                  )}
                </View>

              </View>
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

  userName: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

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

  emptyText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },

  /* ---------- CARDS ---------- */

  card: {
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },

  cardSubtitle: {
    color: "#f2f2f2",
    fontSize: 14,
    lineHeight: 20,
  },

  highlight: {
    color: "#7B78FF",
    fontWeight: "700",
  },

  /* ---------- PROGRESS ---------- */

  progressNumber: {
    color: "#7B78FF",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 15,
  },

  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  /* ---------- TOP MOODS ---------- */

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  moodText: {
    color: "#fff",
    fontWeight: "500",
  },

  moodCount: { color: "#aaa" },

  /* ---------- TRACK ROWS ---------- */

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

  /* ---------- SESSION HISTORY ---------- */

  sessionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  sessionMood: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    maxWidth: "70%", // mood nigdy nie wypchnie feedbacku
  },

  sessionFeedback: {
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
    maxWidth: "30%", // gwarantuje brak overflow
  },

  sessionDate: {
    color: "#aaa",
    fontSize: 12,
  },

  /* ---------- TAGS ---------- */

  tagRegulation: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(123,120,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(123,120,255,0.7)",
  },

  tagCurrent: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  tagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

