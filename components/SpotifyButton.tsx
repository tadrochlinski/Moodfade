import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface Props {
  onPress: () => void;
}

export default function SpotifyButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>Connect to Spotify</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  text: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});
