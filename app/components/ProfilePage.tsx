'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/library/firebase';

// 1. The Master List (Ensures consistency for your matching algos)
const MASTER_SKILLS = [
  "Technology 💻", "Cooking 🍳", "Driving 🚗", 
  "Groceries 🛒", "Gardening 🌿", "Pets 🐾",
  "Fitness 🏃", "Reading 📚", "Music 🎵", 
  "Art 🎨", "Cleaning 🧹", "Finance 💰",
  "Baking 🍞"
];

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { userData, logOut } = useAuth();
  
  // Local state
  const [interests, setInterests] = useState<string[]>(userData?.interests || []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTag, setCustomTag] = useState('');

  if (!userData) return null;

  // Toggle Logic (Add/Remove from Master List)
  const toggleInterest = async (tag: string) => {
    const isSelected = interests.includes(tag.toLowerCase());
    const userRef = doc(db, "users", userData.uid);
    const tagLower = tag.toLowerCase();

    // 1. Update UI Instantly
    let newInterests;
    if (isSelected) {
      newInterests = interests.filter(t => t !== tagLower);
    } else {
      newInterests = [...interests, tagLower];
    }
    setInterests(newInterests);

    // 2. Update Firestore
    if (isSelected) {
      await updateDoc(userRef, { interests: arrayRemove(tagLower) });
    } else {
      await updateDoc(userRef, { interests: arrayUnion(tagLower) });
    }
  };

  // Handle Custom Tag
  const addCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTag.trim();
    if (!tag) return;

    await toggleInterest(tag); // Re-use toggle logic
    setCustomTag('');
    setIsAddingCustom(false);
  };

  const handleLogout = async () => {
    if (confirm("Log out of Kindred?")) {
      setIsLoggingOut(true);
      await logOut();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pt-8 pb-20 px-4 animate-in fade-in duration-500">
      
      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-800 rounded-[2.5rem] shadow-xl border border-zinc-100 dark:border-zinc-700 overflow-hidden relative">
        
        {/* HEADER IMAGE */}
        <div className="h-40 bg-gradient-to-r from-blue-600 to-purple-600 relative">
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 bg-black/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-black/30 transition border border-white/10"
          >
            ← Back
          </button>
        </div>

        {/* CONTENT CONTAINER */}
        <div className="px-8 pb-10">
          
          {/* AVATAR (Properly Positioned) */}
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="w-32 h-32 rounded-full bg-white dark:bg-zinc-800 p-2 shadow-2xl ring-4 ring-white dark:ring-zinc-800">
               <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-6xl">
                  {userData.role === 'youth' ? '🧑‍💻' : '👵'}
               </div>
            </div>
          </div>

          {/* USER INFO */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {userData.name}
            </h1>
            <p className="text-zinc-500 text-sm mt-1 mb-4 font-medium">{userData.email}</p>
            
            <div className="inline-flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-600">
              <span className="px-4 py-1 rounded-full bg-white dark:bg-zinc-600 shadow-sm text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                {userData.role}
              </span>
              <span className="px-3 text-xs font-mono text-zinc-400">
                ID: {userData.familyId}
              </span>
            </div>
          </div>

          {/* SKILLS SELECTOR */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                My Skills & Interests
              </h3>
              <span className="text-xs text-zinc-400">
                {interests.length} selected
              </span>
            </div>

            {/* Grid of Options */}
            <div className="flex flex-wrap gap-2">
              {MASTER_SKILLS.map((skill) => {
                const isActive = interests.includes(skill.toLowerCase());
                return (
                  <button
                    key={skill}
                    onClick={() => toggleInterest(skill)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border transform active:scale-95
                      ${isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none' 
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                  >
                    {skill}
                  </button>
                );
              })}

              {/* Custom Tag Button */}
              {!isAddingCustom ? (
                <button 
                  onClick={() => setIsAddingCustom(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors"
                >
                  + Add Custom
                </button>
              ) : (
                <form onSubmit={addCustomTag} className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                  <input
                    autoFocus
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Type..."
                    className="w-24 px-3 py-2 rounded-xl text-sm border border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    onBlur={() => !customTag && setIsAddingCustom(false)}
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 text-white px-3 rounded-xl text-sm font-bold"
                  >
                    ✓
                  </button>
                </form>
              )}
            </div>
            
            {/* Show any existing custom tags that aren't in master list */}
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.filter(i => !MASTER_SKILLS.map(ms => ms.toLowerCase()).includes(i)).map(custom => (
                 <button
                   key={custom}
                   onClick={() => toggleInterest(custom)}
                   className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-2 group"
                 >
                   {custom}
                   <span className="text-blue-400 group-hover:text-blue-600">×</span>
                 </button>
              ))}
            </div>

          </div>

          {/* LOGOUT */}
          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-700">
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-4 rounded-xl text-red-600 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
            >
              {isLoggingOut ? 'Signing Out...' : 'Log Out'}
            </button>
          </div>

        </div>
      </div>
      
      <p className="text-center text-zinc-300 text-[10px] uppercase tracking-widest mt-8 font-medium">
        Kindred OS • Build v1.2
      </p>
    </div>
  );
}