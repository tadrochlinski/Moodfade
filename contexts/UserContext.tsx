import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

type UserData = {
  name: string;
  favoriteArtists: string[];
  mood?: string;
};


type UserContextType = {
  userData: UserData | null;
  setUserData: (data: UserData) => void;
};

const UserContext = createContext<UserContextType>({
  userData: null,
  setUserData: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [userData, setUserDataState] = useState<UserData | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const saved = await SecureStore.getItemAsync('userData');
      if (saved) {
        try {
          setUserDataState(JSON.parse(saved));
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
    };
    loadUserData();
  }, []);

  const setUserData = async (data: UserData) => {
    setUserDataState(data);
    try {
      await SecureStore.setItemAsync('userData', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save user data:', err);
    }
  };

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
