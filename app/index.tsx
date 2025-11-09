import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthProvider";
import { auth, db } from "../utils/firebaseConfig";
import { sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import backgroundAnimation from "../assets/lottie/Background.json";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { currentUser, signIn, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (awaitingVerification) {
      interval = setInterval(async () => {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          clearInterval(interval);
          setAwaitingVerification(false);
          router.replace("/welcome");
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [awaitingVerification]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (currentUser && currentUser.emailVerified) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) router.replace("/(tabs)/home" as any);
          else router.replace("/welcome");
        } catch (error) {
          console.error("❌ Error checking user profile:", error);
        }
      }
    };
    checkUserProfile();
  }, [currentUser]);

  const handleSignIn = async () => {
    try {
      setSignInLoading(true);
      await signIn(email.trim(), password);
      const user = auth.currentUser;
      if (user && !user.emailVerified) setAwaitingVerification(true);
    } catch (error: any) {
      Alert.alert("Błąd logowania", error.message);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setSignUpLoading(true);
      await signUp(email.trim(), password);
      setAwaitingVerification(true);
    } catch (error: any) {
      Alert.alert("Błąd rejestracji", error.message);
    } finally {
      setSignUpLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      setResending(true);
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        Alert.alert("Verification email sent", "Please check your inbox.");
      }
    } catch {
      Alert.alert("Error", "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  if (awaitingVerification && !currentUser?.emailVerified) {
    return (
      <View style={styles.verifyContainer}>
        <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />
        <View style={styles.verifyBox}>
          <Text style={styles.verifyTitle}>Check your inbox</Text>
          <Text style={styles.verifySubtitle}>
            We’ve sent a verification link to{"\n"}
            <Text style={{ color: "#fff", fontWeight: "600" }}>{auth.currentUser?.email}</Text>
          </Text>
          <TouchableOpacity
            onPress={resendVerification}
            disabled={resending}
            style={[styles.verifyButton, resending && { opacity: 0.7 }]}
          >
            {resending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.whiteButtonText}>Resend verification email</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center", width: "100%" }}>
        <Image
          source={require("../assets/moodfade_banner.png")}
          style={styles.banner}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Log in or create an account to get started</Text>

        <View style={styles.form}>
          <View style={styles.cardInput}>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.cardInput}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#bbb"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={signInLoading || signUpLoading}
            style={[styles.whiteButton, signInLoading && { opacity: 0.7 }]}
          >
            {signInLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.whiteButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={signUpLoading || signInLoading}
            style={[styles.darkButton, signUpLoading && { opacity: 0.7 }]}
          >
            {signUpLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.darkButtonText}>Sign up</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🔹 verify email
  verifyContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  verifyBox: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 50,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  verifyTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  verifySubtitle: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  verifyButton: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },

  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  banner: { width: width * 0.75, height: 140, marginBottom: 20 },
  subtitle: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 35,
    lineHeight: 22,
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
  input: { color: "#fff", fontSize: 16, paddingVertical: 12 },

  whiteButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#fff",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  whiteButtonText: { color: "#000", fontWeight: "700", fontSize: 16 },
  darkButton: {
    width: "100%",
    marginTop: 15,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  darkButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
