import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

interface SpotifyContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  refreshToken: () => Promise<void>;
  loading: boolean;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadStoredTokens = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("spotify_token");
        const storedRefresh = await SecureStore.getItemAsync(
          "spotify_refresh_token",
        );
        console.log(
          "📦 Stored token?",
          !!storedToken,
          "Refresh?",
          !!storedRefresh,
        );

        if (storedRefresh) setRefreshTokenValue(storedRefresh);

        if (storedToken) {
          setToken(storedToken);
          console.log("✅ Loaded stored Spotify access token.");
        } else if (storedRefresh) {
          console.log(
            "🔄 No access token, but refresh token found — refreshing now...",
          );
          await refreshTokenInternal(storedRefresh);
        } else {
          console.warn("⚠️ No Spotify tokens found — redirecting to connect");
          router.replace("../auth/welcome");
        }
      } catch (error) {
        console.error("❌ Error restoring Spotify tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredTokens();
  }, []);

  const refreshTokenInternal = async (manualRefresh?: string | null) => {
    const refreshValue = manualRefresh || refreshTokenValue;
    if (!refreshValue) {
      console.warn("⚠️ No refresh token — redirecting to reconnect");
      router.replace("../auth/welcome");
      return;
    }

    try {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshValue,
        client_id: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
      });

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/spotify/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refresh_token: refreshValue,
          }),
        },
      );

      const data = await res.json();

      if (data.access_token) {
        setToken(data.access_token);
        await SecureStore.setItemAsync("spotify_token", data.access_token);
        console.log("♻️ Spotify token refreshed successfully");
      } else {
        console.warn("⚠️ Spotify refresh failed:", data);
        router.replace("../auth/welcome");
      }
    } catch (err) {
      console.error("❌ Error refreshing Spotify token:", err);
      router.replace("../auth/welcome");
    }
  };

  const refreshToken = async () => refreshTokenInternal();

  useEffect(() => {
    if (!refreshTokenValue) return;
    const interval = setInterval(() => refreshToken(), 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshTokenValue]);

  return (
    <SpotifyContext.Provider value={{ token, setToken, refreshToken, loading }}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = (): SpotifyContextType => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
};
