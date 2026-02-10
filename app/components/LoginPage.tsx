'use client';
import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/library/firebase';

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // AuthGate will handle the redirect after successful login
    } catch (error: any) {
      console.error("Error during login:", error);
      alert('Login failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF5F1] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        {/* You can replace this with your own cute GIF or logo */}
        <div className="mb-6 text-6xl">🏡</div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Kindred</h1>
        <p className="text-gray-500 mb-8">Reconnecting families, one chat at a time.</p>
        
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-all transform active:scale-95 disabled:opacity-50"
        >
          {isLoading ? 'Signing In...' : 'Sign In with Google'}
        </button>
      </div>
    </div>
  );
}