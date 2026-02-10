// context/AuthContext.js
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '@/library/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // The Firestore Profile Data
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        
        // CHECK IF PROFILE EXISTS
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data()); // User has a profile
          // router.push('/dashboard'); // Optional: Auto-redirect
        } else {
          // USER IS LOGGED IN BUT HAS NO PROFILE -> ONBOARDING
          router.push('/onboarding');
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const googleSignIn = () => {
    signInWithPopup(auth, googleProvider);
  };

  const logOut = () => {
    signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, googleSignIn, logOut, loading }}>
      {loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);