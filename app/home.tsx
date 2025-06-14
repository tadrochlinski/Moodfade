import { useEffect } from 'react';
import { Text, ScrollView, View, ActivityIndicator, Pressable } from 'react-native';
import { useUser } from '../contexts/UserContext';
import useMoodSongs from '../hooks/useMoodSongs';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

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

  const { tracks, loading } = useMoodSongs(mood);

  useEffect(() => {
    if (!loading) {
      console.log(`🎧 Found ${tracks.length} tracks for mood "${mood}":`);
      tracks.forEach((track, index) => {
        console.log(`${index + 1}. ${track.title} — ${track.author}`);
      });
    }
  }, [tracks, loading, mood]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
          marginBottom: 40,
        }}
      >
        {favoriteArtistsDisplay}
      </Text>

      {/* End Session Button */}
      <Pressable
        onPress={() => router.push('/feedback')}
        style={{
          backgroundColor: '#fff',
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: 25,
          alignSelf: 'center',
        }}
      >
        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>
          End Session
        </Text>
      </Pressable>

    </ScrollView>
  );
}
