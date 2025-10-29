import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, StyleSheet as RNStyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useUser } from '../../contexts/UserContext';
import backgroundAnimation from '../../assets/lottie/Background.json';

const moodOptions = [
  { label: 'Positive & Uplifting', emoji: '😊', colors: ['#FF9A9E', '#FAD0C4'] },
  { label: 'Romantic & Sensual', emoji: '💖', colors: ['#FAD0C4', '#FFD1FF'] },
  { label: 'Energetic & Intense', emoji: '🔥', colors: ['#FF6E7F', '#BFE9FF'] },
  { label: 'Calm & Reflective', emoji: '🌙', colors: ['#667EEA', '#764BA2'] },
  { label: 'Melancholic & Dark', emoji: '🌧️', colors: ['#232526', '#414345'] },
  { label: 'Unconventional & Playful', emoji: '🎭', colors: ['#FDC830', '#F37335'] },
];

export default function Settings() {
  const { userData } = useUser();
  const name = userData?.name || 'Friend';
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=444&color=fff&size=128`;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <LottieView source={backgroundAnimation} autoPlay loop style={RNStyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.userName}>{name}</Text>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.profileContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarLarge} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.name}>{name}</Text>
            <Pressable style={styles.editButton}>
              <Text style={styles.editText}>Change Name / Photo</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.whiteButton}>
            <Text style={styles.whiteButtonText}>Change Email</Text>
          </Pressable>
          <Pressable style={styles.whiteButton}>
            <Text style={styles.whiteButtonText}>Change Password</Text>
          </Pressable>
          <Pressable style={styles.whiteButton}>
            <Text style={styles.whiteButtonText}>Manage Favorite Artists</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Mood</Text>
          <Text style={styles.sectionSubtitle}>What kind of energy do you want to move toward?</Text>

          {moodOptions.map(({ label, emoji, colors }) => {
            const selected = selectedMood === label;
            return (
              <Pressable key={label} onPress={() => setSelectedMood(label)} style={{ marginBottom: 12 }}>
                <LinearGradient
                  colors={
                    selected
                      ? (colors as [string, string])
                      : (['#111', '#111'] as [string, string])
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.moodCard,
                    { borderColor: selected ? colors[0] : '#333', borderWidth: selected ? 2 : 1 },
                  ]}
                >
                  <Text style={styles.moodText}>
                    {emoji} {label}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spotify Connection</Text>
          <Pressable style={styles.spotifyButton}>
            <LinearGradient
              colors={['#1DB954', '#1ed760'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spotifyGradient}
            >
              <Text style={styles.spotifyText}>Manage Spotify Account</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Pressable style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#000',
  },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 110,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
  editButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  editText: { color: '#ccc', fontSize: 14, textShadowColor: '#000', textShadowRadius: 6 },

  section: { marginBottom: 35 },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
  sectionSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 15,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },

  whiteButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  whiteButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },

  moodCard: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: '#000',
    textShadowRadius: 6,
  },

  spotifyButton: { marginTop: 10 },
  spotifyGradient: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  spotifyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },

  logoutButton: {
    marginTop: 20,
    borderColor: '#f33',
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  logoutText: {
    color: '#f33',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
});
