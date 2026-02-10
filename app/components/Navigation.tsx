'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

type PageType = 'dashboard' | 'family-tree' | 'chat' | 'open-jio' | 'feed' | 'profile';

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { userData } = useAuth();
  const pathname = usePathname();

  const initials = userData?.name
    ? userData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  const navItems = [
    { 
      id: 'dashboard' as PageType, 
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'family-tree' as PageType, 
      label: 'Tree',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: 'chat' as PageType, 
      label: 'Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      id: 'open-jio' as PageType, 
      label: 'Jio',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'feed' as PageType, 
      label: 'Feed',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-[#CB857C]/10 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 group"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <svg className="w-6 h-6 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-2xl font-serif text-[#9C2D41] group-hover:text-[#CB857C] transition-colors" style={{ fontFamily: 'Georgia, serif' }}>
              Kindred
            </span>
          </button>

          {/* CENTER NAVIGATION */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-5 py-2.5 rounded-2xl text-sm uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${
                  currentPage === item.id
                    ? 'bg-[#9C2D41] text-white shadow-md'
                    : 'text-[#CB857C] hover:text-[#9C2D41] hover:bg-[#FAF7F4]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {/* RIGHT: PROFILE BUTTON */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('profile')}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shadow-md transition-all hover:scale-105 hover:shadow-lg border-2
                ${pathname === '/profile' || currentPage === 'profile'
                  ? 'border-[#9C2D41] ring-4 ring-[#CB857C]/20'
                  : 'border-[#CB857C]/20'
                }
                bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white`}
              title="View Profile"
            >
              {initials}
            </button>
          </div>
          
        </div>
      </div>
    </nav>
  );
}