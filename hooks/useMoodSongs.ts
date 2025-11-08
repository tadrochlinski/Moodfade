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
  imageUrl?: string | null;
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
        console.log('🎧 ===============================');
        console.log('🔍 Fetching tracks for mood:', mood);
        console.log('🔑 Spotify token present:', !!token);
        console.log('👤 Favorite artists:', favoriteArtists);

        const q = query(collection(db, 'tracks'), where('mood_category', '==', mood));
        const snapshot = await getDocs(q);
        let moodTracks: Track[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Track, 'id'>),
          imageUrl: null,
        }));

        console.log(`📀 Found ${moodTracks.length} Firestore tracks for mood ${mood}`);

        moodTracks = moodTracks.sort(() => 0.5 - Math.random()).slice(0, 30);

        if (token) {
          const limitedTracks = moodTracks.slice(0, 10);
          console.log(`🖼️ Fetching covers for ${limitedTracks.length} tracks...`);

          const updatedMap = new Map<string, Track>();

          for (const track of limitedTracks) {
            const searchQuery = `track:${track.title} artist:${track.author}`;
            console.log(`🔎 Searching Spotify for: ${searchQuery}`);

            const res = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                searchQuery
              )}&type=track&limit=1`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('📡 Spotify status:', res.status);
            if (res.status !== 200) {
              const errTxt = await res.text();
              console.warn(`⚠️ Spotify error for "${track.title}": ${errTxt}`);
              continue;
            }

            const data = await res.json();
            const found = data.tracks?.items?.[0];
            if (found && found.album?.images?.length) {
              updatedMap.set(track.id, {
                ...track,
                imageUrl: found.album.images[0].url,
                spotify_url: found.external_urls.spotify,
              });
              console.log(`✅ Found Spotify match: "${found.name}"`);
              console.log(`🖼️ Cover URL: ${found.album.images[0].url}`);
            } else {
              console.warn(`⚠️ No image found for ${track.title}`);
            }

            if (cancelled) return;
          }

          moodTracks = moodTracks.map(t => updatedMap.get(t.id) || t);
        } else {
          console.warn('⚠️ No Spotify token available, skipping image fetch.');
        }

        const collected: Track[] = [];
        const maxArtists = 5;

        if (token && favoriteArtists.length > 0) {
          console.log(`🎤 Fetching top tracks for ${favoriteArtists.length} favorite artists...`);
          for (const artist of favoriteArtists.slice(0, maxArtists)) {
            console.log(`🎶 Fetching top tracks for artist: ${artist}`);
            const searchRes = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const searchJson = await searchRes.json();
            const artistId = searchJson.artists?.items?.[0]?.id;
            if (!artistId) {
              console.warn(`⚠️ Artist not found: ${artist}`);
              continue;
            }

            const topRes = await fetch(
              `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=PL`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const topJson = await topRes.json();
            const topTracks = topJson.tracks ?? [];
            console.log(`🎵 Found ${topTracks.length} top tracks for ${artist}`);

            const selected = topTracks
              .sort(() => 0.5 - Math.random())
              .slice(0, 3)
              .map((item: any) => ({
                id: item.id,
                title: item.name,
                author: item.artists.map((a: any) => a.name).join(', '),
                spotify_url: item.external_urls.spotify,
                imageUrl: item.album?.images?.[0]?.url ?? null,
              }));

            collected.push(...selected);
          }
        }

        console.log('🧩 Combining tracks and removing duplicates...');
        const uniqueById = (arr: Track[]) => {
          const seen = new Set<string>();
          return arr.filter(track => {
            if (seen.has(track.id)) return false;
            seen.add(track.id);
            return true;
          });
        };

        const combined = uniqueById([...moodTracks, ...collected]).slice(0, 45);
        console.log(`✅ Final combined track count: ${combined.length}`);

        if (!cancelled) {
          setTracks(combined);
          console.log('🎧 Tracks state updated.');
        }
      } catch (error) {
        console.error('❌ Error fetching tracks:', error);
        if (!cancelled) setTracks([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log('✅ Done fetching tracks.\n');
        }
      }
    }

    setTracks([]);
    setLoading(false);

    if (mood) fetchTracks();

    return () => {
      cancelled = true;
      console.log('⏹️ Cancelled track fetch.');
    };
  }, [mood, token, JSON.stringify(favoriteArtists)]);

  return { tracks, loading };
}
