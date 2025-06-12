import { Text, ScrollView } from 'react-native';
import { useUser } from '../contexts/UserContext';

const moodEmojis: Record<string, string> = {
  'Positive & Uplifting': '😊',
  'Romantic & Sensual': '💖',
  'Energetic & Intense': '🔥',
  'Calm & Reflective': '🌙',
  'Melancholic & Dark': '🌧️',
  'Unconventional & Playful': '🎭',
};

export default function HomeScreen() {
  const { userData } = useUser();
  console.log('User data (raw):', userData);

  const name = userData?.name || 'Friend';
  const mood = userData?.mood || 'Unknown';
  const emoji = moodEmojis[mood] || '🎵';

  const rawArtists = Array.isArray(userData?.favoriteArtists)
    ? userData.favoriteArtists
    : typeof userData?.favoriteArtists === 'string'
    ? [userData.favoriteArtists]
    : [];

  const favoriteArtistsDisplay =
    rawArtists.length > 2
      ? `${rawArtists.slice(0, 2).join(', ')} and more`
      : rawArtists.join(', ') || 'N/A';

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: '#000',
        padding: 30,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 30,
        }}
      >
        {name}, your playlist is ready! {emoji}
      </Text>

      <Text
        style={{
          color: '#fff',
          fontSize: 20,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {emoji} {mood}
      </Text>

      <Text style={{ color: '#ccc', fontSize: 16, textAlign: 'center' }}>
        With your favorite artists:
      </Text>

      <Text
        style={{
          color: '#fff',
          fontSize: 18,
          textAlign: 'center',
          marginTop: 10,
        }}
      >
        {favoriteArtistsDisplay}
      </Text>
    </ScrollView>
  );
}
