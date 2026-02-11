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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F4] selection:bg-[#9C2D41] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-12 border border-[#CB857C]/20 animate-in fade-in zoom-in-95 duration-500 text-center">
        
        {/* Elegant Logo Icon instead of Emoji */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
          <svg className="w-10 h-10 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>

        {/* Premium Typography */}
        <h1 className="text-4xl font-normal mb-3 text-[#9C2D41] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          Kindred.
        </h1>
        <p className="text-[15px] text-[#CB857C] font-light tracking-wide mb-12 leading-relaxed">
          Reconnecting families, <br />one chat at a time.
        </p>

        {/* Refined Google Sign In Button */}
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#CB857C]/30 text-[#9C2D41] rounded-full text-[13px] uppercase tracking-widest font-bold shadow-sm hover:bg-[#FAF7F4] hover:shadow-md hover:border-[#9C2D41]/40 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
             <svg className="w-5 h-5 animate-spin text-[#9C2D41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
             </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {isLoading ? 'Signing In...' : 'Sign In with Google'}
        </button>

      </div>
    </div>
  );
}