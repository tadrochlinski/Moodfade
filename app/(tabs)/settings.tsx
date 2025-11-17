import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet as RNStyleSheet,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { sendEmailVerification } from "firebase/auth";
import backgroundAnimation from "../../assets/lottie/Background.json";
import { useAuth } from "../../contexts/AuthProvider";
import { useUser } from "../../contexts/UserContext";
import { db, auth } from "../../utils/firebaseConfig";
import { serverTimestamp } from "firebase/firestore";

const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;
const redirectUri =
  process.env.EXPO_PUBLIC_ENV === "production"
    ? "moodfade://redirect"
    : AuthSession.makeRedirectUri();
const discovery = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

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

export default function Settings() {
  const router = useRouter();
  const { user, userData, reloadUserData } = useUser();
  const { logout, changeEmail, changePassword } = useAuth();

  const [name, setName] = useState(userData?.name ?? "");
  const [photoURL, setPhotoURL] = useState(userData?.photoBase64 ?? "");
  const [saving, setSaving] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(
    userData?.targetMood ?? null,
  );

  const [spotifyConnected, setSpotifyConnected] = useState(
    userData?.spotifyConnected ?? false,
  );
  const [loadingSpotify, setLoadingSpotify] = useState(false);

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
    if (response?.type === "success" && user) {
      const { code } = response.params;
      (async () => {
        try {
          setLoadingSpotify(true);
          const backendRes = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/spotify/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                code_verifier: request?.codeVerifier!,
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
            doc(db, "users", user.uid),
            {
              spotifyConnected: true,
              spotifyId: spotifyData.id,
              spotifyDisplayName: spotifyData.display_name,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          setSpotifyConnected(true);
          await reloadUserData();
          Alert.alert(
            "Spotify Connected 🎧",
            `Connected as ${spotifyData.display_name}`,
          );
        } catch {
          Alert.alert(
            "Spotify Error",
            "Failed to connect your Spotify account.",
          );
        } finally {
          setLoadingSpotify(false);
        }
      })();
    }
  }, [response]);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showArtistsModal, setShowArtistsModal] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [artistsInput, setArtistsInput] = useState(
    (userData?.favoriteArtists ?? []).join(", "),
  );

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingMood, setLoadingMood] = useState(false);

  const [awaitingEmailVerification, setAwaitingEmailVerification] =
    useState(false);
  const [resending, setResending] = useState(false);

  const avatarUrl =
    photoURL && photoURL.length > 0
      ? photoURL
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || "Friend")}&background=444&color=fff&size=128`;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      try {
        let base64 = result.assets[0].base64;

        if (!base64) {
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          base64 = btoa(String.fromCharCode(...bytes));
        }

        const uri = `data:image/jpeg;base64,${base64}`;
        setPhotoURL(uri);

        if (user) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { photoBase64: uri });
          await reloadUserData();
        }
      } catch (err) {
        console.error("Image conversion error:", err);
        Alert.alert("❌ Error processing image");
      }
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name, photoBase64: photoURL });
      await reloadUserData();
      Alert.alert("✅ Profile updated!");
    } catch {
      Alert.alert("❌ Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    try {
      setLoadingEmail(true);
      await changeEmail(newEmail);
      setAwaitingEmailVerification(true);
    } catch (e: any) {
      Alert.alert("❌ Error", e.message);
    } finally {
      setLoadingEmail(false);
    }
  };

  async function updateTargetMood(uid: string, mood: string) {
    const userRef = doc(db, "users", uid);

    await updateDoc(userRef, {
      targetMood: mood,
      targetMoodChangedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (awaitingEmailVerification) {
      interval = setInterval(async () => {
        try {
          await auth.currentUser?.reload();
          const current = auth.currentUser;

          if (current && current.email === newEmail && current.emailVerified) {
            clearInterval(interval);
            setAwaitingEmailVerification(false);
            setShowEmailModal(false);
            Alert.alert(
              "Email verified",
              "You will be redirected to login.",
            );
            setTimeout(async () => {
              await logout();
              router.replace("/");
            }, 1200);
          }
        } catch (err: any) {
          if (err.code === "auth/user-token-expired") {
            clearInterval(interval);
            await logout();
            router.replace("/");
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [awaitingEmailVerification, newEmail]);

  const resendVerificationEmail = async () => {
    try {
      setResending(true);
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      Alert.alert("Verification email sent", "Please check your inbox.");
    } catch {
      Alert.alert("Error", "Failed to resend email.");
    } finally {
      setResending(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setLoadingPassword(true);
      await changePassword(newPassword);
      Alert.alert("Password updated!");
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleArtistsSave = async () => {
    if (!user) return;
    try {
      setLoadingArtists(true);
      const artistsArray = artistsInput
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      await updateDoc(doc(db, "users", user.uid), {
        favoriteArtists: artistsArray,
      });
      await reloadUserData();
      Alert.alert("Favorite artists updated!");
      setShowArtistsModal(false);
    } catch {
      Alert.alert("Error updating favorite artists");
    } finally {
      setLoadingArtists(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <LottieView
        source={backgroundAnimation}
        autoPlay
        loop
        style={RNStyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.userName}>{userData?.name || "Friend"}</Text>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.profileContainer}>
          <Pressable onPress={pickImage}>
            <Image source={{ uri: avatarUrl }} style={styles.avatarLarge} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#888"
              style={styles.nameInput}
            />
            <Pressable onPress={saveProfile} style={styles.editButton}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.editText}>Save Name / Photo</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable
            style={styles.whiteButton}
            onPress={() => setShowEmailModal(true)}
          >
            <Text style={styles.whiteButtonText}>Change Email</Text>
          </Pressable>
          <Pressable
            style={styles.whiteButton}
            onPress={() => setShowPasswordModal(true)}
          >
            <Text style={styles.whiteButtonText}>Change Password</Text>
          </Pressable>
          <Pressable
            style={styles.whiteButton}
            onPress={() => setShowArtistsModal(true)}
          >
            <Text style={styles.whiteButtonText}>Manage Favorite Artists</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Mood</Text>
          <Text style={styles.sectionSubtitle}>
            What kind of energy do you want to move toward?
          </Text>

          {moodOptions.map(({ label, emoji, colors }) => {
            const selected = selectedMood === label;
            return (
              <Pressable
                key={label}
                onPress={() => setSelectedMood(label)}
                style={{ marginBottom: 12 }}
              >
                <LinearGradient
                  colors={
                    selected ? (colors as [string, string]) : ["#000", "#000"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.moodCard,
                    {
                      borderColor: selected ? colors[0] : "#333",
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={styles.moodText}>
                    {emoji} {label}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          })}

          <Pressable
            disabled={!selectedMood || loadingMood}
            onPress={async () => {
              if (!user || !selectedMood) return;
              try {
                setLoadingMood(true);
                await updateTargetMood(user.uid, selectedMood!);
                await reloadUserData();
                Alert.alert(
                  "Target mood saved!",
                  `Your mood: ${selectedMood}`,
                );
              } catch {
                Alert.alert("❌ Error saving target mood");
              } finally {
                setLoadingMood(false);
              }
            }}
            style={[styles.whiteButton, { opacity: !selectedMood ? 0.5 : 1 }]}
          >
            {loadingMood ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.whiteButtonText}>Save Target Mood</Text>
            )}
          </Pressable>
        </View>
        <View
          style={[
            styles.section,
            { borderTopWidth: 1, borderTopColor: "#222", paddingTop: 20 },
          ]}
        >
          <Pressable
            style={[styles.whiteButton, { backgroundColor: "#1DB954" }]}
            onPress={() => promptAsync()}
            disabled={loadingSpotify}
          >
            {loadingSpotify ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.whiteButtonText, { color: "#fff" }]}>
                {spotifyConnected ? "Reconnect Spotify" : "Connect Spotify"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={async () => {
              try {
                await logout();
                router.replace("/");
              } catch (err) {
                console.error("Logout error:", err);
                Alert.alert("Error", "Something went wrong while logging out.");
              }
            }}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={showEmailModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {awaitingEmailVerification ? (
              <>
                <Text style={styles.modalTitle}>Check your new inbox</Text>
                <Text style={styles.verifySubtitle}>
                  A confirmation link was sent to{"\n"}
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {newEmail}
                  </Text>
                </Text>
                <Pressable
                  onPress={resendVerificationEmail}
                  disabled={resending}
                  style={[
                    styles.whiteButton,
                    { width: "100%" },
                    resending && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.whiteButtonText}>
                    {resending ? "Resending..." : "Resend verification email"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Change Email</Text>
                <TextInput
                  placeholder="New email"
                  placeholderTextColor="#888"
                  style={styles.modalInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={newEmail}
                  onChangeText={setNewEmail}
                />
                <Pressable
                  onPress={handleEmailChange}
                  style={styles.modalButton}
                >
                  {loadingEmail ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.modalButtonText}>Save</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setShowEmailModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showPasswordModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              placeholder="New password"
              placeholderTextColor="#888"
              style={styles.modalInput}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Pressable
              onPress={handlePasswordChange}
              style={styles.modalButton}
            >
              {loadingPassword ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalButtonText}>Save</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showArtistsModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Favorite Artists</Text>
            <Text style={[styles.verifySubtitle, { marginBottom: 10 }]}>
              Enter artists separated by commas
            </Text>
            <TextInput
              placeholder="E.g. The Weeknd, Lana Del Rey"
              placeholderTextColor="#888"
              style={[
                styles.modalInput,
                { height: 90, textAlignVertical: "top" },
              ]}
              multiline
              value={artistsInput}
              onChangeText={setArtistsInput}
            />
            <Pressable onPress={handleArtistsSave} style={styles.modalButton}>
              {loadingArtists ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalButtonText}>Save</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setShowArtistsModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 110 },
  profileContainer: { alignItems: "center", marginBottom: 40 },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  nameInput: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#555",
    width: 200,
    paddingVertical: 6,
  },
  editButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  editText: { color: "#ccc", fontSize: 14 },
  section: { marginBottom: 35 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  sectionSubtitle: { color: "#ccc", fontSize: 14, marginBottom: 15 },
  whiteButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
  },
  whiteButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  moodCard: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  moodText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  logoutButton: {
    marginTop: 10,
    borderColor: "#f33",
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  logoutText: { color: "#f33", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  modalContainer: {
    backgroundColor: "rgba(0,0,0,1)",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backdropFilter: "blur(10px)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    width: "100%",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  modalButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  cancelText: { color: "#bbb", marginTop: 10 },
  verifySubtitle: { color: "#ccc", textAlign: "center", marginBottom: 20 },
});
