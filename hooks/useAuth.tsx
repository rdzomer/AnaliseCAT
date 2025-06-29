// src/hooks/useAuth.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { Role } from '../types';

interface User {
  uid: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: Role) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Novo estado

  const signUp = async (email: string, password: string, name: string, role: Role) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // salva os dados do usuário no Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      role,
    });

    setUser({
      uid: cred.user.uid,
      email: cred.user.email || '',
      name,
      role,
    });
  };

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: data.name || '',
        role: data.role as Role,
      });
    } else {
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: '',
        role: Role.ANALISTA,
      });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || '',
          role: userData.role || Role.ANALISTA,
        });
      } else {
        setUser(null);
      }
      setLoading(false); // só termina após verificação do Firebase
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
