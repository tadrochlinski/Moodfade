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
  _source?: 'current' | 'bridge' | 'target' | 'favoriteArtist';
  _sourceMood?: string | null; 
  _note?: string;
}

const bridgeMoodsMap: Record<string, string> = {
  'Positive & Uplifting': 'Romantic & Sensual',
  'Romantic & Sensual': 'Calm & Reflective',
  'Energetic & Intense': 'Unconventional & Playful',
  'Calm & Reflective': 'Romantic & Sensual',
  'Melancholic & Dark': 'Calm & Reflective',
  'Unconventional & Playful': 'Energetic & Intense',
};

export default function useMoodSongs(
  currentMood: string | null | undefined,
  targetMood?: string | null | undefined,
  mode: 'current' | 'regulation' = 'current'
) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const { token } = useSpotify();
  const { userData } = useUser();
  const favoriteArtists = userData?.favoriteArtists ?? [];

  // —————————————— helpers ——————————————
  const logDivider = (label: string) => {
    const pad = 12 - Math.min(12, label.length);
    console.log(`\n🎛️ ${'='.repeat(8)} ${label} ${'='.repeat(8 + pad)}\n`);
  };

  const fmt = (t: Track) =>
    `${t.title} — ${t.author}${t._source ? ` [${t._source}${t._sourceMood ? `:${t._sourceMood}` : ''}]` : ''}`;

  const logList = (prefix: string, list: Track[]) => {
    console.log(prefix);
    list.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2, '0')}. ${fmt(t)}`));
    if (list.length === 0) console.log('  (empty)');
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchTracks() {
      if (!currentMood) return;

      try {
        setLoading(true);
        logDivider('PLAYLIST BUILD START');
        console.log('🧠 Mode:', mode);
        console.log('💭 Current mood:', currentMood);
        console.log('🎯 Target mood:', targetMood ?? '(none)');
        console.log('🎤 Favorite artists:', favoriteArtists);

        let moodTracks: Track[] = [];

        // ============== REGULATION: 40/20/40 ==============
        if (mode === 'regulation' && targetMood) {
          const bridgeMood = bridgeMoodsMap[currentMood ?? ''] ?? null;
          console.log(`🪜 Regulation path: ${currentMood}  →  ${bridgeMood ?? '(no bridge)'}  →  ${targetMood}`);

          const currentQuery = query(collection(db, 'tracks'), where('mood_category', '==', currentMood));
          const targetQuery = query(collection(db, 'tracks'), where('mood_category', '==', targetMood));
          const bridgeQuery = bridgeMood
            ? query(collection(db, 'tracks'), where('mood_category', '==', bridgeMood))
            : null;

          const [currentSnap, targetSnap, bridgeSnap] = await Promise.all([
            getDocs(currentQuery),
            getDocs(targetQuery),
            bridgeQuery ? getDocs(bridgeQuery) : Promise.resolve({ docs: [] as any[] }),
          ]);

          const currentPool: Track[] = currentSnap.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any),
            imageUrl: null,
            _source: 'current',
            _sourceMood: currentMood,
          }));

          const targetPool: Track[] = targetSnap.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any),
            imageUrl: null,
            _source: 'target',
            _sourceMood: targetMood,
          }));

          const bridgePool: Track[] = (bridgeSnap as any)?.docs?.map((doc: any) => ({
            id: doc.id,
            ...(doc.data() as any),
            imageUrl: null,
            _source: 'bridge',
            _sourceMood: bridgeMood,
          })) ?? [];

          logDivider('POOLS');
          console.log(`📚 Current pool (${currentMood}): ${currentPool.length}`);
          console.log(`📚 Bridge pool (${bridgeMood ?? '—'}): ${bridgePool.length}`);
          console.log(`📚 Target pool (${targetMood}): ${targetPool.length}`);

          const fromCurrent = currentPool.sort(() => 0.5 - Math.random()).slice(0, 12);
          const fromBridge = bridgePool.sort(() => 0.5 - Math.random()).slice(0, 6);
          const fromTarget = targetPool.sort(() => 0.5 - Math.random()).slice(0, 12);

          logDivider('PICKS 40/20/40');
          logList(`🎚️ 40% Current (${fromCurrent.length}):`, fromCurrent);
          logList(`🎚️ 20% Bridge  (${fromBridge.length}):`, fromBridge);
          logList(`🎚️ 40% Target  (${fromTarget.length}):`, fromTarget);

          moodTracks = [...fromCurrent, ...fromBridge, ...fromTarget];
          console.log(`🧩 Combined (pre-spotify, pre-favorites): ${moodTracks.length} tracks`);
        }

        else {
          const q = query(collection(db, 'tracks'), where('mood_category', '==', currentMood));
          const snapshot = await getDocs(q);
          let currentOnly: Track[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Track, 'id'>),
            imageUrl: null,
            _source: 'current',
            _sourceMood: currentMood,
          }));

          console.log(`📚 Current pool (${currentMood}): ${currentOnly.length}`);
          currentOnly = currentOnly.sort(() => 0.5 - Math.random()).slice(0, 30);

          logDivider('PICKS 100% CURRENT');
          logList(`🎚️ 30 from "${currentMood}" (${currentOnly.length}):`, currentOnly);

          moodTracks = currentOnly;
        }

        if (token) {
          logDivider('SPOTIFY ENRICH (covers + urls)');
          const limited = moodTracks.slice(0, 10);
          console.log(`🔎 Enriching first ${limited.length} tracks via /search (covers)`);
          const updatedMap = new Map<string, Track>();

          for (const track of limited) {
            const searchQuery = `track:${track.title} artist:${track.author}`;
            const res = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.status !== 200) {
              const errTxt = await res.text();
              console.warn(`⚠️ Spotify search failed [${res.status}] for "${searchQuery}": ${errTxt}`);
              continue;
            }

            const data = await res.json();
            const found = data.tracks?.items?.[0];
            if (found && found.album?.images?.length) {
              updatedMap.set(track.id, {
                ...track,
                imageUrl: found.album.images[0].url,
                spotify_url: found.external_urls.spotify,
                _note: `enriched from Spotify search id=${found.id}`,
              });
              console.log(`✅ Cover found: ${fmt(track)} → ${found.album.images[0].url}`);
            } else {
              console.log(`➖ No cover for: ${fmt(track)}`);
            }

            if (cancelled) return;
          }

          moodTracks = moodTracks.map(t => updatedMap.get(t.id) || t);
        } else {
          console.warn('⚠️ No Spotify token → skipping covers enrichment');
        }

        const collected: Track[] = [];
        if (token && favoriteArtists.length > 0) {
          logDivider('FAVORITE ARTISTS (top-tracks)');
          const maxArtists = 5;
          for (const artist of favoriteArtists.slice(0, maxArtists)) {
            try {
              console.log(`🎤 Artist: ${artist} → search ID`);
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
              console.log(`🎵 Top-tracks fetched: ${artist} (${topTracks.length})`);

              const selected = topTracks
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .map((item: any) => ({
                  id: item.id,
                  title: item.name,
                  author: item.artists.map((a: any) => a.name).join(', '),
                  spotify_url: item.external_urls.spotify,
                  imageUrl: item.album?.images?.[0]?.url ?? null,
                  _source: 'favoriteArtist',
                  _sourceMood: null,
                  _note: `fav:${artist}`,
                })) as Track[];

              logList(`➕ Added from favorite "${artist}" (${selected.length}):`, selected);
              collected.push(...selected);
            } catch (e) {
              console.warn(`⚠️ Favorite artist failed: ${artist}`, e);
            }
          }
        } else {
          console.log('ℹ️ No favorite artists or no token → skipping favorites step');
        }

        logDivider('MERGE + DEDUP');
        const seen = new Set<string>();
        const combined = [...moodTracks, ...collected].filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });

        const tagged = combined.map(t => {
          const tag =
            t._source === 'current' ? '[C]' :
            t._source === 'bridge' ?  '[B]' :
            t._source === 'target' ?  '[T]' :
            t._source === 'favoriteArtist' ? '[F]' : '[?]';
          return `${tag} ${t.title} — ${t.author}${t._sourceMood ? ` (${t._sourceMood})` : ''}`;
        });

        console.log(`🔗 Combined total (pre-slice): ${combined.length}`);
        logList('📜 Combined list:', combined);

        const final = combined.slice(0, 45);
        console.log(`✅ Final list size: ${final.length}`);
        console.log('🏷️ Final (compact):\n' + final.map(t => {
          const tag =
            t._source === 'current' ? '[C]' :
            t._source === 'bridge' ?  '[B]' :
            t._source === 'target' ?  '[T]' :
            t._source === 'favoriteArtist' ? '[F]' : '[?]';
          return `  • ${tag} ${t.title} — ${t.author}${t._sourceMood ? ` (${t._sourceMood})` : ''}`;
        }).join('\n'));

        if (!cancelled) setTracks(final);
      } catch (error) {
        console.error('❌ Error fetching tracks:', error);
        if (!cancelled) setTracks([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          logDivider('PLAYLIST BUILD END');
        }
      }
    }

    setTracks([]);
    setLoading(false);
    if (currentMood && mode) fetchTracks();

    return () => {
      cancelled = true;
      console.log('⏹️ Cancelled track fetch.');
    };
  }, [currentMood, targetMood, mode, token, JSON.stringify(favoriteArtists)]);

  return { tracks, loading };
}
