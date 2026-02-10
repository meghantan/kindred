'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext'; // Import the hook
import Navigation from '@/app/components/Navigation'; // Updated to absolute path for safety
import FamilyTreePage from '@/app/components/FamilyTreePage';
import TranslationPage from '@/app/components/TranslationPage';
import OpenJioPage from '@/app/components/OpenJioPage';
import FeedPage from '@/app/components/FeedPage';

type PageType = 'dashboard' | 'family-tree' | 'translation' | 'open-jio' | 'feed';

export default function Home() {
  const { userData } = useAuth(); // Get real user data
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'family-tree':
        return <FamilyTreePage />;
      case 'translation':
        return <TranslationPage />;
      case 'open-jio':
        return <OpenJioPage />;
      case 'feed':
        return <FeedPage />;
      default:
        // Pass the real name to the dashboard
        return <Dashboard onNavigate={setCurrentPage} userName={userData?.name} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="pt-16">
        {renderPage()}
      </main>
    </div>
  );
}

// Update props interface to accept userName
function Dashboard({ onNavigate, userName }: { onNavigate: (page: PageType) => void, userName?: string | null }) {
  const features = [
    {
      id: 'family-tree' as PageType,
      title: 'Family Tree',
      description: 'View and edit your interactive family tree',
      icon: '🌳',
      color: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    },
    {
      id: 'translation' as PageType,
      title: 'Translation Bridge',
      description: 'Translate between generations and languages',
      icon: '🌉',
      color: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'open-jio' as PageType,
      title: 'Open Jio',
      description: 'Plan and join family activities',
      icon: '📅',
      color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'feed' as PageType,
      title: 'Family Feed',
      description: 'Share everyday moments with family',
      icon: '💬',
      color: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image
            src="/next.svg"
            alt="Kindred logo"
            width={40}
            height={40}
            className="dark:invert"
          />
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Kindred
          </h1>
        </div>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-2">
          {/* Use the Real Name with a fallback */}
          Welcome back, {userName?.split(' ')[0] || 'Family Member'}
        </p>
        <p className="text-zinc-500 dark:text-zinc-500">
          Your Family Operating System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => onNavigate(feature.id)}
            className={`${feature.color} p-6 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {feature.title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {feature.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-12 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Mom added new photos to the family tree</span>
            <span className="text-zinc-400">2h ago</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Dad created a jio for weekend dim sum</span>
            <span className="text-zinc-400">5h ago</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Grandma shared a recipe in the feed</span>
            <span className="text-zinc-400">1d ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}