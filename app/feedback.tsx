import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const feedbackOptions = [
  'Very Positive',
  'Positive',
  'Neutral',
  'Negative',
  'Very Negative',
];

export default function FeedbackScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = () => {
    if (!selected) {
      Alert.alert('Please select how you feel.');
      return;
    }

    console.log('📝 User feedback (not saved):', {
      mood: selected,
      timestamp: new Date().toISOString(),
    });

    Alert.alert('Thank you!', `Feedback: ${selected}`);
    router.replace('/');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        How do you feel?
      </Text>
      <Text
        style={{
          color: '#ccc',
          fontSize: 16,
          marginBottom: 30,
          textAlign: 'center',
        }}
      >
        Let us know how the music made you feel 🎧
      </Text>

      {feedbackOptions.map((option) => {
        const isSelected = selected === option;

        const optionContent = (
          <View
            style={{
              backgroundColor: '#111',
              padding: 15,
              borderRadius: 10,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: isSelected ? '#fff' : '#fff',
                fontSize: 16,
                fontWeight: isSelected ? 'bold' : 'normal',
              }}
            >
              {option}
            </Text>
          </View>
        );

        return (
          <Pressable
            key={option}
            onPress={() => setSelected(option)}
            style={{ marginBottom: 15, width: '100%', borderRadius: 12 }}
          >
            {isSelected ? (
              <LinearGradient
                colors={['#ff00c3', '#00d4ff']} // 🎨 Nowy gradient dopasowany do animacji
                start={[0, 0]}
                end={[1, 1]}
                style={{
                  padding: 2,
                  borderRadius: 12,
                }}
              >
                {optionContent}
              </LinearGradient>

            ) : (
              optionContent
            )}
          </Pressable>
        );
      })}

      <Pressable
        onPress={handleSubmit}
        style={{
          backgroundColor: '#fff',
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: 25,
          marginTop: 20,
        }}
      >
        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>
          Submit Feedback
        </Text>
      </Pressable>
    </View>
  );
}
