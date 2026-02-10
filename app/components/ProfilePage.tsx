'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { userData, logOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!userData) return <div className="p-10 text-center">Loading Profile...</div>;

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      setIsLoggingOut(true);
      await logOut();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-4 bg-white dark:bg-zinc-800 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-700 overflow-hidden">
      
      {/* Header with Back Button */}
      <div className="h-32 bg-gradient-to-r from-orange-300 to-red-300 relative">
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 bg-white/30 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/50 transition flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>
      </div>
      
      <div className="px-6 pb-8 relative">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-white dark:bg-zinc-800 p-1 absolute -top-12 left-1/2 transform -translate-x-1/2 shadow-sm">
           <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-4xl">
              {userData.role === 'youth' ? '🧑‍💻' : '👵'}
           </div>
        </div>

        {/* User Details */}
        <div className="mt-14 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{userData.name}</h1>
          <p className="text-zinc-500 text-sm mt-1">{userData.email}</p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 text-xs px-3 py-1 rounded-full font-bold uppercase">{userData.role}</span>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-700">
           <button 
             onClick={handleLogout}
             disabled={isLoggingOut}
             className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition flex items-center justify-center"
           >
             {isLoggingOut ? 'Signing Out...' : '🚪 Log Out'}
           </button>
        </div>
      </div>
    </div>
  );
}