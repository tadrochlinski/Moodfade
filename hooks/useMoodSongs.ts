import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

export interface Track {
  id: string;
  title: string;
  author: string;
  genre: string;
  mood_category: string;
}

export default function useMoodSongs(mood: string) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTracks() {
      try {
        console.log('🔍 Fetching tracks for mood:', mood);

        const q = query(
          collection(db, 'tracks'),
          where('mood_category', '==', mood)
        );
        const snapshot = await getDocs(q);

        const allTracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Track, 'id'>),
        }));

        console.log(`🎧 Found ${allTracks.length} tracks for mood "${mood}":`);
        console.table(allTracks);

        // Wybierz 30 losowych
        const shuffled = allTracks.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 30);

        setTracks(selected);
      } catch (error) {
        console.error('❌ Error fetching tracks:', error);
      } finally {
        setLoading(false);
      }
    }

    if (mood) {
      fetchTracks();
    }
  }, [mood]);

  return { tracks, loading };
}
