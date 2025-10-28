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

export default function useMoodSongs(mood: string | null | undefined) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const { token } = useSpotify();
  const { userData } = useUser();
  const favoriteArtists = userData?.favoriteArtists ?? [];

  useEffect(() => {
    let cancelled = false;

    async function fetchTracks() {
      if (!mood) return;

      try {
        setLoading(true);
        console.log('🔍 Fetching tracks for mood:', mood);

        const q = query(collection(db, 'tracks'), where('mood_category', '==', mood));
        const snapshot = await getDocs(q);
        const moodTracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Track, 'id'>),
        }));
        const shuffledMood = moodTracks.sort(() => 0.5 - Math.random()).slice(0, 30);

        const collected: Track[] = [];
        const maxArtists = 10;

        if (token && favoriteArtists.length > 0) {
          for (const artist of favoriteArtists.slice(0, maxArtists)) {
            const searchRes = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const searchJson = await searchRes.json();
            const artistId = searchJson.artists?.items?.[0]?.id;
            if (!artistId) continue;

            const topRes = await fetch(
              `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=PL`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const topJson = await topRes.json();
            const topTracks = topJson.tracks ?? [];

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

        const uniqueById = (arr: Track[]) => {
          const seen = new Set<string>();
          return arr.filter(track => {
            if (seen.has(track.id)) return false;
            seen.add(track.id);
            return true;
          });
        };

        const combined = uniqueById([...shuffledMood, ...collected]).slice(0, 45);

        if (!cancelled) setTracks(combined);
      } catch (error) {
        console.error('❌ Error fetching tracks:', error);
        if (!cancelled) setTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setTracks([]);
    setLoading(false);

    if (mood) fetchTracks();

    return () => {
      cancelled = true;
    };
  }, [mood, token, JSON.stringify(favoriteArtists)]);

  return { tracks, loading };
}
