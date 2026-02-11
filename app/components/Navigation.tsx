'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type PageType = 'dashboard' | 'family-tree' | 'chat' | 'open-jio' | 'feed' | 'profile';

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

// --- Reusable Avatar Component ---
const UserAvatar = ({ name, url, size = "w-10 h-10", textClass = "text-sm" }: { name: string, url?: string | null, size?: string, textClass?: string }) => {
  const [imageError, setImageError] = useState(false);
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  return (
    <div className={`${size} rounded-full flex items-center justify-center border-2 border-white shadow-sm relative overflow-hidden shrink-0 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] transition-all duration-300`}>
      {!imageError && url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <span className={`font-semibold text-[#FAF7F4] tracking-wider ${textClass}`}>{initials}</span>
      )}
    </div>
  );
};

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { userData } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { 
      id: 'dashboard' as PageType, 
      label: 'Home',
      icon: (
        // Removed mb-1 to fix floating issue
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'family-tree' as PageType, 
      label: 'Tree',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: 'chat' as PageType, 
      label: 'Chat',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      id: 'open-jio' as PageType, 
      label: 'Jio',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'feed' as PageType, 
      label: 'Feed',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-[#CB857C]/15 z-50 shadow-sm h-24 flex items-center">
      <div className="w-full max-w-[1400px] mx-auto px-8 grid grid-cols-3 items-center">
        
        {/* LEFT: LOGO */}
        <div className="flex items-center justify-start">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center group transition-transform active:scale-95"
          >
            <span className="text-3xl font-light text-[#9C2D41] group-hover:text-[#CB857C] transition-colors tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Kindred.
            </span>
          </button>
        </div>

        {/* CENTER: NAVIGATION LINKS */}
        <div className="flex items-center justify-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              // Adjusted gap and padding for better vertical centering
              className={`flex flex-col items-center justify-center gap-1.5 py-2 px-4 rounded-xl transition-all duration-300 group
                ${currentPage === item.id 
                  ? 'text-[#9C2D41]' 
                  : 'text-[#CB857C]/70 hover:text-[#9C2D41] hover:bg-[#FAF7F4]/80'
                }`}
            >
              <div className={`transition-transform duration-300 ${currentPage === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              {/* Increased text size from text-[10px] to text-xs */}
              <span className={`text-xs uppercase tracking-widest transition-all duration-300
                ${currentPage === item.id ? 'font-bold opacity-100' : 'font-semibold opacity-70 group-hover:opacity-100'}
              `}>
                {item.label}
              </span>
              
              <div className={`w-1 h-1 rounded-full bg-[#9C2D41] mt-0.5 transition-all duration-300
                ${currentPage === item.id ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
              `} />
            </button>
          ))}
        </div>

        {/* RIGHT: PROFILE BUTTON */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => onNavigate('profile')}
            className={`rounded-full p-0.5 transition-all duration-300 focus:outline-none hover:scale-105 active:scale-95
              ${currentPage === 'profile' 
                ? 'ring-2 ring-offset-2 ring-[#9C2D41] bg-[#FAF7F4]' 
                : 'hover:ring-2 hover:ring-offset-2 hover:ring-[#CB857C]/40 hover:bg-[#FAF7F4]'
              }`}
            title="View Profile"
          >
            <UserAvatar 
              name={userData?.name || 'User'} 
              url={userData?.photoURL} 
              size="w-12 h-12" 
              textClass="text-[16px]" 
            />
          </button>
        </div>
        
      </div>
    </nav>
  );
}