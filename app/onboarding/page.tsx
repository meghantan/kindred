'use client';

import React, { useState } from 'react'; 
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/library/firebase'; 

interface UserProfile {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  role: 'youth' | 'elderly';
  interests: string[];
  familyId: string;
  createdAt: string;
}

export default function Onboarding() {
  const auth = getAuth();
  const user = auth.currentUser;
  const router = useRouter();
  
  const [role, setRole] = useState<'youth' | 'elderly'>('youth');
  const [interests, setInterests] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use React.FormEvent<HTMLFormElement> to satisfy TypeScript
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        alert("No user found. Please log in again.");
        return;
    }
    setIsSubmitting(true);

    try {
      const newProfile: UserProfile = {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL,
        role: role,
        interests: interests.split(',').map((tag) => tag.trim().toLowerCase()).filter(tag => tag !== ''), 
        familyId: "family_demo_123",
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", user.uid), newProfile);
      
      await setDoc(doc(db, "families", "family_demo_123"), {
        name: "The Tan Family",
        createdAt: new Date().toISOString()
      }, { merge: true });

      router.push('/'); 
    } catch (error) {
      console.error("Error creating profile:", error);
      alert("Something went wrong. Check the console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FFF5F1]"> 
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Kindred</h1>
          <p className="text-gray-500">Let's set up your profile.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">I am a...</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('youth')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2
                  ${role === 'youth' 
                    ? 'border-orange-500 bg-orange-50 text-orange-700' 
                    : 'border-gray-200 hover:border-orange-200 text-gray-600'}`}
              >
                <span className="text-2xl">🧑‍💻</span>
                <span className="font-medium">Youth</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('elderly')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2
                  ${role === 'elderly' 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-green-200 text-gray-600'}`}
              >
                <span className="text-2xl">👵</span>
                <span className="font-medium">Senior</span>
              </button>
            </div>
          </div>

          {/* Interests Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              My Interests & Skills
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Baking, Coding, Cats..."
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02]
              ${isSubmitting ? 'bg-gray-400' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
          >
            {isSubmitting ? 'Joining Family...' : 'Join Family Space'}
          </button>
        </form>
      </div>
    </div>
  );
}