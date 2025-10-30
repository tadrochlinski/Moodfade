import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthProvider';
import { auth, db } from '../utils/firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import backgroundAnimation from '../assets/lottie/Background.json';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { currentUser, signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [resending, setResending] = useState(false);

  // 🔁 Auto-check co kilka sekund, czy mail został zweryfikowany
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (awaitingVerification) {
      interval = setInterval(async () => {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          clearInterval(interval);
          setAwaitingVerification(false);
          router.replace('/welcome');
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [awaitingVerification]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (currentUser && currentUser.emailVerified) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            router.replace('/(tabs)/home' as any);
          } else {
            router.replace('/welcome');
          }
        } catch (error) {
          console.error('❌ Error checking user profile:', error);
        }
      }
    };
    checkUserProfile();
  }, [currentUser]);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signIn(email.trim(), password);
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        setAwaitingVerification(true);
      }
    } catch (error: any) {
      Alert.alert('Błąd logowania', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setAuthLoading(true);
      await signUp(email.trim(), password);
      setAwaitingVerification(true);
    } catch (error: any) {
      Alert.alert('Błąd rejestracji', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      setResending(true);
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        Alert.alert('Verification email sent', 'Please check your inbox.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  // 📨 Ekran oczekiwania na weryfikację e-maila
  if (awaitingVerification && !currentUser?.emailVerified) {
    return (
      <View style={styles.verifyContainer}>
        <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />

        <View style={styles.verifyBox}>
          <Text style={styles.verifyTitle}>Check your inbox</Text>
          <Text style={styles.verifySubtitle}>
            We’ve sent a verification link to{'\n'}
            <Text style={{ color: '#fff', fontWeight: '600' }}>{auth.currentUser?.email}</Text>
          </Text>

          <TouchableOpacity
            onPress={resendVerification}
            disabled={resending}
            style={[styles.whiteButton, resending && { opacity: 0.6 }]}
          >
            <Text style={styles.whiteButtonText}>
              {resending ? 'Resending...' : 'Resend verification email'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 🔑 Ekran logowania / rejestracji
  return (
    <View style={styles.container}>
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />

      <Image
        source={require('../assets/moodfade_banner.png')}
        style={styles.banner}
        resizeMode="contain"
      />

      <Text style={styles.subtitle}>Log in or create an account to get started</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {authLoading ? (
          <ActivityIndicator color="#FF6EC4" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <TouchableOpacity onPress={handleSignIn} style={{ width: '100%', marginTop: 15 }}>
              <LinearGradient
                colors={['#FF6EC4', '#7873F5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.gradientButtonText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignUp} style={{ width: '100%', marginTop: 15 }}>
              <View style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Sign up</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🧩 verify email
  verifyContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  verifyBox: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
    borderRadius: 20,
  },
  verifyTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
  verifySubtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  whiteButton: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  whiteButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // 🧩 login
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  banner: {
    width: width * 0.8,
    height: 160,
    marginBottom: 20,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    fontSize: 16,
  },
  gradientButton: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF6EC4',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  gradientButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#222',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
