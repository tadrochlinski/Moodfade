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
  Modal,
} from "react-native";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthProvider";
import { auth, db } from "../../utils/firebaseConfig";
import { sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import backgroundAnimation from "../../assets/lottie/Background.json";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { currentUser, signIn, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

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
          router.replace("/auth/welcome");
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [awaitingVerification]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (currentUser) {
        if (currentUser.emailVerified) {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) router.replace("/(tabs)/home" as any);
          else router.replace("/auth/welcome");
        } else {
          setAwaitingVerification(true);
        }
      }
    };
    checkUserProfile();
  }, [currentUser]);

  const handleSignIn = async () => {
    try {
      setSignInLoading(true);
      await signIn(email.trim(), password);
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        setAwaitingVerification(true);
      }
    } catch (err: any) {
      Alert.alert("Sign-in error", err.message);
    } finally {
      setSignInLoading(false);
    }
  };


  const handleSignUp = async () => {
    if (password !== repeatPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    try {
      setSignUpLoading(true);
      await signUp(email.trim(), password);
      setAwaitingVerification(true);
    } catch (err: any) {
      Alert.alert("Sign-up error", err.message);
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

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    try {
      setForgotLoading(true);
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      Alert.alert("Email sent", "Check your inbox to reset your password.");
      setForgotVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setForgotLoading(false);
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
        style={{ opacity: fadeAnim, alignItems: "center", width: "100%" }}
      >
        <Image
          source={require("../../assets/images/moodfade_banner.png")}
          style={styles.banner}
          resizeMode="contain"
        />

        <Text style={styles.subtitle}>
          Log in or create an account to get started
        </Text>

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
              autoCorrect={false}
              textContentType="oneTimeCode"
              autoComplete="off"
              importantForAutofill="no"
              secureTextEntry={false}
            />
          </View>
          <View style={styles.cardInput}>
            <TextInput
              style={[styles.input, { paddingRight: 40 }]}
              placeholder="Password"
              placeholderTextColor="#bbb"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none"
              autoComplete="off"
              importantForAutofill="no"
            />

            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword((p) => !p)}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#bbb"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardInput}>
            <TextInput
              style={[styles.input, { paddingRight: 40 }]}
              placeholder="Repeat password (sign up only)"
              placeholderTextColor="#bbb"
              secureTextEntry={!showRepeatPassword}
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="oneTimeCode"
              autoComplete="off"
              importantForAutofill="no"
            />

            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowRepeatPassword((p) => !p)}
            >
              <MaterialCommunityIcons
                name={showRepeatPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#bbb"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setForgotVisible(true)}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={signInLoading}
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
            disabled={signUpLoading}
            style={[styles.darkButton, signUpLoading && { opacity: 0.7 }]}
          >
            {signUpLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.darkButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
      <Modal transparent visible={forgotVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reset password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email and we'll send you a reset link.
            </Text>

            <TextInput
              placeholder="Your email"
              placeholderTextColor="#999"
              style={styles.modalInput}
              value={forgotEmail}
              onChangeText={setForgotEmail}
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={forgotLoading}
              style={[styles.modalButton, forgotLoading && { opacity: 0.7 }]}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalButtonText}>Send link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAwaitingVerification(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={awaitingVerification} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Check your inbox</Text>

            <Text style={styles.modalSubtitle}>
              We've sent a verification link to{"\n"}
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {auth.currentUser?.email}
              </Text>
            </Text>

            <TouchableOpacity
              onPress={resendVerification}
              disabled={resending}
              style={[styles.modalButton, resending && { opacity: 0.7 }]}
            >
              {resending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalButtonText}>
                  Resend verification email
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                setAwaitingVerification(false);
                await auth.signOut();
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  banner: {
    width: width * 0.7,
    height: 180,
    marginBottom: 25,
  },

  subtitle: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 35,
    lineHeight: 22,
  },

  form: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },

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

  forgotText: {
    marginTop: 10,
    fontSize: 13,
    color: "#7B78FF",
    fontWeight: "600",
  },

  whiteButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 28,
  },

  whiteButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },

  darkButton: {
    width: "100%",
    marginTop: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  darkButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  modalBox: {
    width: "100%",
    maxWidth: 360,
    padding: 25,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },

  modalSubtitle: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },

  modalInput: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },

  modalButton: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 25,
    alignItems: "center",
  },

  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  cancelText: {
    color: "#ccc",
    marginTop: 15,
    fontSize: 14,
  },

  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -12 }],
    padding: 4,
  },
});
