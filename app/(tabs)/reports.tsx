// app/(tabs)/reports.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet as RNStyleSheet,
  StyleSheet,
} from 'react-native';
import LottieView from 'lottie-react-native';
import backgroundAnimation from '../../assets/lottie/Background.json';
import { useUser } from '../../contexts/UserContext';

export default function Reports() {
  const { userData } = useUser();

  const name = userData?.name || 'Friend';
  const targetMood = (userData as any)?.targetMood ?? null;

  const avatarUrl =
    userData?.photoBase64 && userData.photoBase64.length > 0
      ? userData.photoBase64
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name
        )}&background=444&color=fff&size=128`;

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.userName}>{name}</Text>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Lottie background */}
      <LottieView
        source={backgroundAnimation}
        autoPlay
        loop
        style={RNStyleSheet.absoluteFill}
      />

      {/* Header jak w Settings */}
      <Header />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={styles.screenTitle}>Your Emotional Journey</Text>

        {/* Mood History – placeholder wykres */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mood History</Text>
          <Text style={styles.cardSubtitle}>
            Once you finish a few sessions, you&apos;ll see how your moods shift over time.
          </Text>

          <View style={styles.chartPlaceholder}>
            <View style={[styles.chartBar, { height: 40, opacity: 0.3 }]} />
            <View style={[styles.chartBar, { height: 80, opacity: 0.6 }]} />
            <View style={[styles.chartBar, { height: 55, opacity: 0.45 }]} />
            <View style={[styles.chartBar, { height: 70, opacity: 0.7 }]} />
          </View>
        </View>

        {/* Dominant mood */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Dominant Mood</Text>
          {targetMood ? (
            <>
              <Text style={styles.dominantMood}>{targetMood}</Text>
              <Text style={styles.cardSubtitle}>
                After more sessions we&apos;ll confirm whether this is truly your strongest vibe.
              </Text>
            </>
          ) : (
            <Text style={styles.cardSubtitle}>
              We&apos;ll detect your dominant mood once you&apos;ve completed a few sessions.
            </Text>
          )}
        </View>

        {/* Progress toward target mood */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress Toward Target Mood</Text>
          <Text style={styles.cardSubtitle}>
            Target:{' '}
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {targetMood || 'Not set yet (Settings → Target Mood)'}
            </Text>
          </Text>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: '0%' }]} />
          </View>
          <Text style={styles.progressLabel}>
            We&apos;ll start tracking this after your first few listening sessions.
          </Text>
        </View>

        {/* Tekstowa rekomendacja moodu */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Mood Recommendation</Text>
          <Text style={styles.cardSubtitle}>
            Finish some sessions on the Home tab and Moodfade will suggest which moods to explore
            more – or which ones to wind down from.
          </Text>
          <Text style={styles.bullet}>• Try different moods when starting a session.</Text>
          <Text style={styles.bullet}>• Use the feedback screen at the end of each playlist.</Text>
          <Text style={styles.bullet}>
            • Come back here to see how your emotional landscape evolves over time.
          </Text>
        </View>

        {/* Top liked placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Most Liked Tracks</Text>
          <Text style={styles.cardSubtitle}>
            Your favourite songs will appear here once you start liking tracks at the end of a
            session.
          </Text>
        </View>

        {/* Most skipped / disliked placeholder */}
        <View style={[styles.card, { marginBottom: 40 }]}>
          <Text style={styles.cardTitle}>Most Skipped / Disliked</Text>
          <Text style={styles.cardSubtitle}>
            We&apos;ll highlight songs that don&apos;t resonate with you so future playlists can
            avoid them.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // header skopiowany stylistycznie z settings.tsx
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
    paddingHorizontal: 20,
    paddingTop: 110,
  },
  screenTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
  },

  card: {
    backgroundColor: 'rgba(5,5,5,0.9)',
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 12,
  },

  // pseudo-wykres
  chartPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginTop: 8,
    marginBottom: 8,
  },
  chartBar: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#7b3fff',
  },
  chartCaption: {
    color: '#777',
    fontSize: 12,
    marginTop: 4,
  },

  dominantMood: {
    color: '#ff6ec7',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 6,
  },

  progressBarBackground: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#222',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ff6ec7',
  },
  progressLabel: {
    color: '#aaa',
    fontSize: 12,
  },

  bullet: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
});
