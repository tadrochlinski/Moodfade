import { View, Text, TextInput, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const { userData, setUserData } = useUser();
  const router = useRouter();

  const [name, setName] = useState('');
  const [favoriteArtists, setFavoriteArtists] = useState('');

  // 🔄 Wczytaj dane do formularza, jeśli istnieją
  useEffect(() => {
    if (userData) {
      setName(userData.name ?? '');
      setFavoriteArtists(
        Array.isArray(userData.favoriteArtists)
          ? userData.favoriteArtists.join(', ')
          : ''
      );
    }
  }, [userData]);

  const handleSubmit = async () => {
    const artistsArray = favoriteArtists
      .split(',')
      .map((artist) => artist.trim())
      .filter((artist) => artist.length > 0);

    await setUserData({ name, favoriteArtists: artistsArray });

    router.replace('/mood');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Text style={{ color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
        Welcome to Moodfade!
      </Text>
      <Text style={{ color: '#ccc', fontSize: 16, marginBottom: 40, textAlign: 'center' }}>
        {userData ? 'Edit your preferences 🎛️' : 'Tell us something about you 🎉'}
      </Text>

      <TextInput
        placeholder="Your name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
        style={{
          width: '100%',
          backgroundColor: '#111',
          padding: 12,
          borderRadius: 8,
          color: '#fff',
          marginBottom: 20,
        }}
      />

      <TextInput
        placeholder="Favorite artists eg. Coldplay, Bon Iver"
        placeholderTextColor="#888"
        value={favoriteArtists}
        onChangeText={setFavoriteArtists}
        style={{
          width: '100%',
          backgroundColor: '#111',
          padding: 12,
          borderRadius: 8,
          color: '#fff',
          marginBottom: 30,
        }}
      />

      <Pressable
        onPress={handleSubmit}
        style={{
          backgroundColor: '#fff',
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: 25,
        }}
      >
        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>
          {userData ? 'Update & Continue' : 'Continue'}
        </Text>
      </Pressable>
    </View>
  );
}
