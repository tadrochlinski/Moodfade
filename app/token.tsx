import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSpotify } from '../contexts/SpotifyContext';

export default function TokenScreen() {
  const { token } = useSpotify();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your Spotify Token:</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text selectable style={styles.token}>
          {token}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingHorizontal: 10,
  },
  token: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
    textAlign: 'center',
  },
});
