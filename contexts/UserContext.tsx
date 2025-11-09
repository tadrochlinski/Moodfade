import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../utils/firebaseConfig";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

interface UserData {
  name?: string;
  favoriteArtists?: string[];
  spotifyConnected?: boolean;
  photoBase64?: string;
  targetMood?: string;
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
    // 🔹 Reaguje na zmianę stanu logowania
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        console.log(`👤 Logged in as ${firebaseUser.uid}`);
        subscribeToUserDoc(firebaseUser.uid);
      } else {
        console.log("🚪 Logged out");
        setUserData(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 🔥 Real-time subskrypcja Firestore user doc
  const subscribeToUserDoc = (uid: string) => {
    const ref = doc(db, "users", uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.log("📡 Firestore user doc updated:", data);
        setUserData({
          name: data.name ?? "",
          favoriteArtists: data.favoriteArtists ?? [],
          spotifyConnected: data.spotifyConnected ?? false,
          photoBase64: data.photoBase64 ?? "",
          targetMood: data.targetMood ?? "",
        });
      } else {
        console.warn("⚠️ User doc missing in Firestore for UID:", uid);
        setUserData(null);
      }
    });
  };

  const reloadUserData = async () => {
    if (!user?.uid) return;
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        console.log("🔁 Manual reload user data:", data);
        setUserData({
          name: data.name ?? "",
          favoriteArtists: data.favoriteArtists ?? [],
          spotifyConnected: data.spotifyConnected ?? false,
          photoBase64: data.photoBase64 ?? "",
          targetMood: data.targetMood ?? "",
        });
      }
    } catch (error) {
      console.error("❌ Error reloading user data:", error);
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
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
