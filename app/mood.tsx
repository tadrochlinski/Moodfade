import { View, Text, Pressable } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'expo-router';
import { db } from '../utils/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const moodOptions = [
  { label: 'Positive & Uplifting', emoji: '😊', colors: ['#FF9A9E', '#FAD0C4'] },
  { label: 'Romantic & Sensual', emoji: '💖', colors: ['#FAD0C4', '#FFD1FF'] },
  { label: 'Energetic & Intense', emoji: '🔥', colors: ['#FF6E7F', '#BFE9FF'] },
  { label: 'Calm & Reflective', emoji: '🌙', colors: ['#667EEA', '#764BA2'] },
  { label: 'Melancholic & Dark', emoji: '🌧️', colors: ['#232526', '#414345'] },
  { label: 'Unconventional & Playful', emoji: '🎭', colors: ['#FDC830', '#F37335'] },
];

export default function MoodScreen() {
  const { user, reloadUserData } = useUser();
  const router = useRouter();

  const handleSelectMood = async (mood: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { mood, updatedAt: new Date().toISOString() }, { merge: true });
      console.log(`🎭 Mood "${mood}" saved to Firestore.`);
      await reloadUserData();
      router.replace('/home');
    } catch (error) {
      console.error('❌ Error saving mood:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' }}>
      <Text
        style={{
          color: '#fff',
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 30,
          textAlign: 'center',
        }}
      >
        What's your mood today?
      </Text>

      {moodOptions.map(({ label, emoji, colors }) => (
        <Pressable key={label} onPress={() => handleSelectMood(label)} style={{ marginBottom: 15 }}>
          <LinearGradient
            colors={colors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 12, overflow: 'hidden' }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.45)',
                padding: 15,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: '600',
                  textShadowColor: '#000',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {emoji} {label}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}
