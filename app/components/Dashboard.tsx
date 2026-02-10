'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, 
  query, 
  where, 
  Timestamp, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';

// Helper to calculate "2 hours ago"
const getTimeAgo = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

export default function Dashboard() {
  const { userData } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Data States
  const [photoFeed, setPhotoFeed] = useState<any[]>([]); // New state for images
  const [myUpcomingJios, setMyUpcomingJios] = useState<any[]>([]);
  const [recentFamilyActivities, setRecentFamilyActivities] = useState<any[]>([]);
  const [selectedJio, setSelectedJio] = useState<any | null>(null); 
  const [familyStats, setFamilyStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    loading: true
  });

  // 1. Live Data Fetching
  useEffect(() => {
    if (!userData?.familyId) return;

    const fid = userData.familyId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // A. Fetch Family Stats
    const membersQuery = query(collection(db, "users"), where("familyId", "==", fid));
    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      setFamilyStats(prev => ({ ...prev, totalMembers: snapshot.size }));
    });

    // B. Fetch Feed Photos (Linked to FeedPage)
    // We use the same query as FeedPage to avoid index errors, then filter in JS
    const feedQuery = query(
      collection(db, "posts"), 
      where("familyId", "==", fid),
      orderBy("createdAt", "desc"),
      limit(20) // Fetch last 20 posts to find images
    );

    const unsubFeed = onSnapshot(feedQuery, (snapshot) => {
      const photos = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((post: any) => post.imageUrl) // Only keep posts with images
        .map((post: any) => ({
          id: post.id,
          author: post.authorName,
          image: post.imageUrl,
          caption: post.content,
          time: getTimeAgo(post.createdAt)
        }))
        .slice(0, 5); // Take top 5
      
      setPhotoFeed(photos);
    });

    // C. Fetch My Jios
    const myJiosQuery = query(
      collection(db, "jios"),
      where("familyId", "==", fid),
      where("date", ">=", Timestamp.fromDate(today)),
      where("participants", "array-contains", userData.name)
    );

    const unsubMyJios = onSnapshot(myJiosQuery, (snapshot) => {
      const jios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        displayDate: doc.data().date?.toDate().toLocaleDateString('en-SG', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        })
      }));
      setMyUpcomingJios(jios);
      setFamilyStats(prev => ({ ...prev, upcomingEvents: jios.length, loading: false }));
    });

    // D. Fetch Recent Activity Log
    const recentQuery = query(collection(db, "jios"), where("familyId", "==", fid));
    const unsubRecent = onSnapshot(recentQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 3);
      setRecentFamilyActivities(activities);
    });

    return () => {
      unsubMembers();
      unsubFeed();
      unsubMyJios();
      unsubRecent();
    };
  }, [userData]);

  // Carousel Auto-Rotation
  useEffect(() => {
    if (photoFeed.length === 0) return;
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % photoFeed.length), 5000);
    return () => clearInterval(interval);
  }, [photoFeed.length]);

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-light text-[#9C2D41] mb-3 tracking-tight">
            Welcome back, <span className="font-normal">{userData?.name?.split(' ')[0] || 'Member'}</span>
          </h1>
          <p className="text-[#CB857C]/70 text-lg font-light">Here is your personal family schedule.</p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          {/* PHOTO CAROUSEL (Now Real Data) */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] border border-[#CB857C]/20 overflow-hidden shadow-lg h-96 relative group">
              {photoFeed.length > 0 ? (
                <div className="relative h-full w-full">
                  {photoFeed.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                        index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                      }`}
                    >
                      <img src={item.image} className="w-full h-full object-cover" alt="Family memory" />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#9C2D41]/90 via-[#9C2D41]/20 to-transparent opacity-80" />
                      
                      {/* Caption */}
                      <div className="absolute bottom-0 left-0 p-8 text-white w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {item.author}
                          </span>
                          <span className="text-white/80 text-xs font-medium">• {item.time}</span>
                        </div>
                        <p className="text-3xl font-light leading-tight line-clamp-2 drop-shadow-md">
                          {item.caption || "A new memory shared"}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicators */}
                  <div className="absolute bottom-4 right-8 flex gap-2">
                    {photoFeed.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentSlide ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                // Fallback State (No Photos)
                <div className="h-full flex flex-col items-center justify-center bg-[#FAF7F4] text-[#CB857C]">
                  <div className="text-5xl mb-4 opacity-50">📸</div>
                  <h3 className="text-xl font-bold text-[#9C2D41]">No photos yet</h3>
                  <p className="text-sm font-light mt-2">Photos posted in the Feed will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Family Stats Card */}
          <div className="bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-[2rem] shadow-xl p-8 flex flex-col justify-center space-y-8 text-white relative overflow-hidden">
            {/* Decorative Circle */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-end border-b border-white/20 pb-6 mb-6">
                <span className="text-sm font-medium opacity-90 uppercase tracking-widest">Family<br/>Members</span>
                <span className="text-6xl font-light">{familyStats.loading ? '-' : familyStats.totalMembers}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium opacity-90 uppercase tracking-widest">Upcoming<br/>Events</span>
                <span className="text-6xl font-light">{familyStats.loading ? '-' : familyStats.upcomingEvents}</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Upcoming Activities */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#9C2D41] rounded-2xl flex items-center justify-center text-white shadow-md">
              <span className="text-xl">📅</span>
            </div>
            <div>
              <h2 className="text-3xl font-light text-[#9C2D41]">My Upcoming Activities</h2>
              <p className="text-[#CB857C] text-sm">Events you have joined</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {myUpcomingJios.length > 0 ? (
              myUpcomingJios.map((jio) => (
                <button 
                  key={jio.id} 
                  onClick={() => setSelectedJio(jio)}
                  className="text-left p-6 rounded-[2rem] bg-white border border-[#CB857C]/20 shadow-sm hover:shadow-lg hover:border-[#9C2D41]/30 hover:-translate-y-1 transition-all active:scale-95 group"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 rounded-full bg-[#FAF7F4] text-[10px] font-bold text-[#9C2D41] uppercase tracking-wide border border-[#CB857C]/10">{jio.category}</span>
                    <span className="text-xs text-[#CB857C] font-bold uppercase">{jio.displayDate}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#9C2D41] mb-2 group-hover:text-[#CB857C] transition-colors">{jio.title}</h3>
                  <p className="text-sm text-[#CB857C]/80 font-light line-clamp-2 leading-relaxed">{jio.description}</p>
                </button>
              ))
            ) : (
              <div className="col-span-3 py-16 text-center border-2 border-dashed border-[#CB857C]/20 rounded-[2rem]">
                <p className="text-[#9C2D41] font-bold text-lg">No activities scheduled</p>
                <p className="text-[#CB857C] text-sm mt-1">Check the 'Jio' page to join events!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border border-[#CB857C]/20 shadow-lg">
          <h2 className="text-2xl font-light text-[#9C2D41] mb-8 flex items-center gap-3">
            <span className="text-2xl">🚀</span> Recent Updates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentFamilyActivities.map((activity) => (
              <div key={activity.id} className="p-5 rounded-2xl bg-white border border-[#CB857C]/10 shadow-sm flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-[#9C2D41] shrink-0"></div>
                <div>
                  <p className="text-sm text-[#4A4A4A] leading-relaxed">
                    <span className="font-bold text-[#9C2D41]">{activity.creator}</span> created a new event: <span className="italic">{activity.title}</span>
                  </p>
                </div>
              </div>
            ))}
            {recentFamilyActivities.length === 0 && (
               <p className="text-[#CB857C] italic pl-2">No recent updates.</p>
            )}
          </div>
        </div>

      </div>

      {/* Pop-up Modal (Identical to previous) */}
      {selectedJio && (
        <div className="fixed inset-0 bg-[#9C2D41]/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-[#F6CBB7] relative text-left">
            <button onClick={() => setSelectedJio(null)} className="absolute top-6 right-6 text-[#CB857C] text-2xl hover:text-[#9C2D41] transition-colors">✕</button>
            
            <div className="text-center mb-8 mt-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#FAF7F4] text-[#9C2D41] font-bold text-xs mb-5 uppercase tracking-widest border border-[#CB857C]/20">
                {selectedJio.category}
              </span>
              <h2 className="text-3xl font-bold text-[#9C2D41] mb-3 leading-tight">{selectedJio.title}</h2>
              <p className="text-[#CB857C] font-serif text-lg italic">"{selectedJio.description}"</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 bg-[#FAF7F4] p-4 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedJio.creator[0]}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#CB857C] tracking-wider">Organized by</p>
                  <p className="font-bold text-[#9C2D41] text-lg">{selectedJio.creator}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FAF7F4] p-4 rounded-2xl text-center">
                  <p className="text-[10px] uppercase font-bold text-[#CB857C] mb-1">Time</p>
                  <p className="font-bold text-[#9C2D41] text-lg">{selectedJio.time}</p>
                </div>
                <div className="bg-[#FAF7F4] p-4 rounded-2xl text-center">
                  <p className="text-[10px] uppercase font-bold text-[#CB857C] mb-1">Date</p>
                  <p className="font-bold text-[#9C2D41] text-lg">{selectedJio.displayDate}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedJio(null)} 
              className="w-full py-4 bg-[#9C2D41] text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-[#852233] hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}