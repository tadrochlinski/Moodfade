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
import { db } from '../utils/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import backgroundAnimation from '../assets/lottie/Background.json';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { currentUser, signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            router.replace('/mood');
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
    } catch (error: any) {
      Alert.alert('Błąd rejestracji', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LottieView source={backgroundAnimation} autoPlay loop style={StyleSheet.absoluteFill} />

      <Image source={require('../assets/moodfade_banner.png')} style={styles.banner} resizeMode="contain" />

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
                colors={['#FF6EC4', '#7873F5'] as const}
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
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  banner: { width: width * 0.8, height: 160, marginBottom: 20 },
  subtitle: { color: '#ccc', fontSize: 15, textAlign: 'center', marginBottom: 30 },
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
  gradientButton: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF6EC4',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  gradientButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
