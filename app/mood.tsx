import { View, Text, Pressable } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'expo-router';

const moodOptions = [
  { label: 'Positive & Uplifting', emoji: '😊' },
  { label: 'Romantic & Sensual', emoji: '💖' },
  { label: 'Energetic & Intense', emoji: '🔥' },
  { label: 'Calm & Reflective', emoji: '🌙' },
  { label: 'Melancholic & Dark', emoji: '🌧️' },
  { label: 'Unconventional & Playful', emoji: '🎭' },
];

export default function MoodScreen() {
  const { userData, setUserData } = useUser();
  const router = useRouter();

  const handleSelectMood = async (mood: string) => {
    if (userData) {
      await setUserData({ ...userData, mood });
      router.replace('/home');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' }}>
        What&aposs your mood today?
      </Text>

      {moodOptions.map(({ label, emoji }) => (
        <Pressable
          key={label}
          onPress={() => handleSelectMood(label)}
          style={{
            backgroundColor: '#111',
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>
            {emoji} {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
