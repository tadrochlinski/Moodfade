import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useSpotify } from '../contexts/SpotifyContext';
import { useUser } from '../contexts/UserContext';

export interface Track {
  id: string;
  title: string;
  author: string;
  genre?: string;
  mood_category?: string;
  spotify_url?: string;
}

export default function useMoodSongs(mood: string) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const { token } = useSpotify();
  const { userData } = useUser();
  const favoriteArtists = userData?.favoriteArtists ?? [];

  useEffect(() => {
    async function fetchTracks() {
      try {
        console.log('🔍 Fetching tracks for mood:', mood);

        // 1. Pobierz utwory z Firestore
        const q = query(collection(db, 'tracks'), where('mood_category', '==', mood));
        const snapshot = await getDocs(q);
        const moodTracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Track, 'id'>),
        }));

        const shuffledMood = moodTracks.sort(() => 0.5 - Math.random()).slice(0, 30);

        // 2. Pobierz top tracks z Spotify dla ulubionych artystów
        const collected: Track[] = [];
        const maxArtists = 10;

        if (token && favoriteArtists.length > 0) {
          for (const artist of favoriteArtists.slice(0, maxArtists)) {
            // A. Wyszukaj artystę i uzyskaj jego ID
            const searchRes = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const searchJson = await searchRes.json();
            const artistId = searchJson.artists?.items?.[0]?.id;
            if (!artistId) continue;

            // B. Pobierz top tracks artysty
            const topRes = await fetch(
              `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=PL`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const topJson = await topRes.json();
            const topTracks = topJson.tracks ?? [];

            // C. Losowo wybierz 2–3 utwory
            const selected = topTracks
              .sort(() => 0.5 - Math.random())
              .slice(0, 3)
              .map((item: any) => ({
                id: item.id,
                title: item.name,
                author: item.artists.map((a: any) => a.name).join(', '),
                spotify_url: item.external_urls.spotify,
              }));

            collected.push(...selected);
          }
        }

        // 3. Scal i odfiltruj duplikaty
        const uniqueById = (arr: Track[]) => {
          const seen = new Set();
          return arr.filter(track => {
            if (seen.has(track.id)) return false;
            seen.add(track.id);
            return true;
          });
        };

        const combined = uniqueById([...shuffledMood, ...collected]);
        const final = combined.slice(0, 45); // Maksymalnie 45 utworów

        setTracks(final);
      } catch (error) {
        console.error('❌ Error fetching tracks:', error);
      } finally {
        setLoading(false);
      }
    }

    if (mood) fetchTracks();
  }, [mood, token, JSON.stringify(favoriteArtists)]);

  return { tracks, loading };
}
