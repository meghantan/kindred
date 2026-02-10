'use client';

import { useState, useEffect } from 'react';
import { db } from '@/library/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


interface DashboardProps {
  userName?: string | null;
}

export default function Dashboard({ userName }: DashboardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [familyStats, setFamilyStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    newPosts: 0,
    loading: true
  });

  // Fetch real family stats from Firebase
  useEffect(() => {
    const fetchFamilyStats = async () => {
      try {
        const membersQuery = query(
          collection(db, "users"),
          where("familyId", "==", "family_demo_123")
        );
        const membersSnapshot = await getDocs(membersQuery);
        const totalMembers = membersSnapshot.size;

        let upcomingEvents = 0;
        try {
          const today = new Date().toISOString().split('T')[0];
          const jiosQuery = query(
            collection(db, "jios"),
            where("familyId", "==", "family_demo_123"),
            where("date", ">=", today)
          );
          const jiosSnapshot = await getDocs(jiosQuery);
          upcomingEvents = jiosSnapshot.size;
        } catch (error) {
          console.log('No jios collection yet');
        }

        const newPosts = 0;

        setFamilyStats({
          totalMembers,
          upcomingEvents,
          newPosts,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching family stats:', error);
        setFamilyStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchFamilyStats();
  }, []);
  
  const feedItems = [
    {
      id: 1,
      author: 'Mom',
      image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop',
      caption: 'Beautiful family dinner tonight',
      time: '2 hours ago',
      likes: 12
    },
    {
      id: 2,
      author: 'Dad',
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop',
      caption: 'Weekend dim sum adventure',
      time: '5 hours ago',
      likes: 8
    },
    {
      id: 3,
      author: 'Grandma',
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',
      caption: 'My secret recipe for chicken rice',
      time: '1 day ago',
      likes: 15
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % feedItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [feedItems.length]);

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-light text-[#9C2D41] mb-3 tracking-tight">
            Welcome back, <span className="font-normal">{userName?.split(' ')[0] || 'Member'}</span>
          </h1>
          
          <p className="text-[#CB857C]/70 text-lg font-light">
            Here's what your family has been up to
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Feed Carousel */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#CB857C]/20 overflow-hidden shadow-lg">
              <div className="px-6 py-5 border-b border-[#CB857C]/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-normal text-[#9C2D41]">Family Feed</h2>
                    <p className="text-sm text-[#CB857C]/60 mt-0.5 font-light">Latest moments</p>
                  </div>
                  <button 
                    className="text-sm font-normal text-[#9C2D41] hover:text-[#CB857C] transition-colors flex items-center gap-1.5"
                  >
                    View All
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Carousel */}
              <div className="relative h-96 bg-[#F6CBB7]/10">
                {feedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="relative h-full">
                      <img 
                        src={item.image} 
                        alt={item.caption}
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-[#9C2D41]/90 via-[#9C2D41]/30 to-transparent"></div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-[#FAF7F4]/20 backdrop-blur-md rounded-full flex items-center justify-center border border-[#FAF7F4]/30">
                            <span className="text-sm font-normal text-[#FAF7F4]">{item.author[0]}</span>
                          </div>
                          <div>
                            <p className="font-normal text-[#FAF7F4]">{item.author}</p>
                            <p className="text-sm text-[#FAF7F4]/80 font-light">{item.time}</p>
                          </div>
                        </div>
                        <p className="text-lg text-[#FAF7F4] mb-2 font-light">{item.caption}</p>
                        <div className="flex items-center gap-2 text-sm text-[#FAF7F4]/90 font-light">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          <span>{item.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {feedItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-1 rounded-full transition-all ${
                        index === currentSlide 
                          ? 'bg-[#FAF7F4] w-8' 
                          : 'bg-[#FAF7F4]/40 w-1 hover:bg-[#FAF7F4]/60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Family Overview */}
          <div className="bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FAF7F4]/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-[#FAF7F4]/20">
                <svg className="w-5 h-5 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-normal text-[#FAF7F4]">Family Overview</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-[#FAF7F4]/10 backdrop-blur-sm rounded-xl p-4 border border-[#FAF7F4]/10">
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF7F4]/90 font-light">Total Members</span>
                  <span className="text-3xl font-light text-[#FAF7F4]">
                    {familyStats.loading ? '—' : familyStats.totalMembers}
                  </span>
                </div>
              </div>
              <div className="bg-[#FAF7F4]/10 backdrop-blur-sm rounded-xl p-4 border border-[#FAF7F4]/10">
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF7F4]/90 font-light">Upcoming Events</span>
                  <span className="text-3xl font-light text-[#FAF7F4]">
                    {familyStats.loading ? '—' : familyStats.upcomingEvents}
                  </span>
                </div>
              </div>
              <div className="bg-[#FAF7F4]/10 backdrop-blur-sm rounded-xl p-4 border border-[#FAF7F4]/10">
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF7F4]/90 font-light">New Posts</span>
                  <span className="text-3xl font-light text-[#FAF7F4]">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[#CB857C]/20 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#CB857C]/10 rounded-xl flex items-center justify-center border border-[#CB857C]/20">
              <svg className="w-5 h-5 text-[#9C2D41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-normal text-[#9C2D41]">Recent Activity</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { text: 'Mom added 5 photos to the tree', time: '2h ago' },
              { text: 'Dad created dim sum jio', time: '5h ago' },
              { text: 'Grandma shared a recipe', time: '1d ago' }
            ].map((activity, index) => (
              <div key={index} className="p-4 rounded-xl bg-[#F6CBB7]/10 border border-[#CB857C]/10 hover:bg-[#F6CBB7]/20 transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-[#CB857C] rounded-full group-hover:bg-[#9C2D41] transition-colors"></div>
                </div>
                <p className="text-sm font-light text-[#9C2D41] mb-1">
                  {activity.text}
                </p>
                <span className="text-xs text-[#CB857C]/60 font-light">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}