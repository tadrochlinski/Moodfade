import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  User,
} from "firebase/auth";
import { auth } from "../utils/firebaseConfig";

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeEmail: (newEmail: string, currentPassword?: string) => Promise<void>;
  changePassword: (
    newPassword: string,
    currentPassword?: string,
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
      console.log(`📧 Verification email sent to ${email}`);
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const reauthenticateIfNeeded = async (password?: string) => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    if (!password) return;
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      password,
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const changeEmail = async (newEmail: string, currentPassword?: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    try {
      await reauthenticateIfNeeded(currentPassword);
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
      console.log(`📨 Verification email sent to ${newEmail}`);
    } catch (error: any) {
      console.error("Error changing email:", error);
      throw error;
    }
  };

  const changePassword = async (
    newPassword: string,
    currentPassword?: string,
  ) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    try {
      await reauthenticateIfNeeded(currentPassword);
      await updatePassword(auth.currentUser, newPassword);
    } catch (error: any) {
      console.error("Error changing password:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signUp,
        signIn,
        logout,
        changeEmail,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
