'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import OnboardingPage from '@/app/components/OnboardingPage';
import Navigation from '@/app/components/Navigation';
import FamilyTreePage from '@/app/components/FamilyTreePage';
import ChatPage from '@/app/components/ChatPage';
import OpenJioPage from '@/app/components/OpenJioPage';
import FeedPage from '@/app/components/FeedPage';
import ProfilePage from '@/app/components/ProfilePage';
import Dashboard from '@/app/components/Dashboard';

type PageType = 'dashboard' | 'family-tree' | 'chat' | 'open-jio' | 'feed' | 'profile';

export default function Page() {
  const { user, userData, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  // State to hold the member selected from Family Tree
  const [preselectedChatMember, setPreselectedChatMember] = useState<any>(null);

  // Handler to switch to chat and set the user
  const handleNavigateToChat = (member: any) => {
    // Transform FamilyMember (id) to UserProfile (uid) format if necessary
    const chatMember = {
      ...member,
      uid: member.id // Ensure we have a uid property for ChatPage
    };
    setPreselectedChatMember(chatMember);
    setCurrentPage('chat');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'family-tree':
        return <FamilyTreePage onNavigateToChat={handleNavigateToChat} />;
      case 'chat':
        return <ChatPage preselectedMember={preselectedChatMember} />;
      case 'open-jio':
        return <OpenJioPage />;
      case 'feed':
        return <FeedPage />;
      case 'profile': 
        return <ProfilePage onBack={() => setCurrentPage('dashboard')} />;
      default:
        return <Dashboard />;  // FIXED: Removed userName prop
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-[#9C2D41] font-medium">Loading Kindred...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login or show login page
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
        <div className="text-center">
          <h1 className="text-2xl font-normal text-[#9C2D41] mb-4">Please log in</h1>
          <p className="text-[#CB857C] font-light">You need to be logged in to access Kindred.</p>
        </div>
      </div>
    );
  }

  // User is logged in but hasn't completed onboarding
  if (!userData) {
    return <OnboardingPage onComplete={() => window.location.reload()} />;
  }

  // User is logged in and has completed onboarding
  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="pt-16">
        {renderPage()}
      </main>
    </div>
  );
}