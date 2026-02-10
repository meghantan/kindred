'use client';

import Image from 'next/image';

type PageType = 'dashboard' | 'family-tree' | 'translation' | 'open-jio' | 'feed';

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: 'dashboard' as PageType, label: 'Home', icon: '🏠' },
    { id: 'family-tree' as PageType, label: 'Tree', icon: '🌳' },
    { id: 'translation' as PageType, label: 'Translate', icon: '🌉' },
    { id: 'open-jio' as PageType, label: 'Jio', icon: '📅' },
    { id: 'feed' as PageType, label: 'Feed', icon: '💬' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100"
          >
            <Image
              src="/next.svg"
              alt="Kindred"
              width={24}
              height={24}
              className="dark:invert"
            />
            Kindred
          </button>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              ST
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
