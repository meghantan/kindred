'use client';
import { useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/library/firebase';
import { LoginPage } from './LoginPage';
import Onboarding from '@/app/onboarding/page';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // REPLACES SPRING BOOT LOGIC: Check if user exists in Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setHasProfile(true);
        } else {
          setHasProfile(false); // User needs to onboard
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FFF5F1]">
        <div className="animate-pulse text-2xl">Loading Kindred...</div>
      </div>
    );
  }

  // 2. Not Logged In -> Show Login Page
  if (!user) {
    return <LoginPage />;
  }

  // 3. Logged In BUT No Profile -> Show Onboarding
  if (!hasProfile) {
    // We render Onboarding here to keep it simple, or you can router.push('/onboarding')
    // For now, let's assume we want to force them to fill it out
    return <Onboarding />; 
  }

  // 4. Logged In AND Has Profile -> Show the App (Children)
  return <>{children}</>;
}