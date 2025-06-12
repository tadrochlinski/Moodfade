import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SpotifyContextType {
  token: string | null;
  setToken: (token: string | null) => void;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  return (
    <SpotifyContext.Provider value={{ token, setToken }}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = (): SpotifyContextType => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};
