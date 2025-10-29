import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../utils/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface UserData {
  name?: string;
  favoriteArtists?: string[];
  spotifyConnected?: boolean;
  photoBase64?: string; // 👈 zamiast photoURL
}

interface UserContextType {
  user: any;
  userData: UserData | null;
  reloadUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log(`👤 Logged in as ${firebaseUser.uid}, loading Firestore data...`);
        await fetchUserData(firebaseUser.uid);
      } else {
        console.log('🚪 Logged out');
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const reloadUserData = async () => {
    if (user?.uid) {
      console.log('🔁 Manual reload of user data triggered');
      await fetchUserData(user.uid);
    }
  };

  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log('📄 Firestore user data loaded:', data);
        setUserData(data as UserData);
      } else {
        console.warn('⚠️ No user data found in Firestore for UID:', uid);
        setUserData(null);
      }
    } catch (error) {
      console.error('❌ Error fetching user data from Firestore:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, userData, reloadUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
