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
  const [photoFeed, setPhotoFeed] = useState<any[]>([]);
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
    const feedQuery = query(
      collection(db, "posts"), 
      where("familyId", "==", fid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubFeed = onSnapshot(feedQuery, (snapshot) => {
      const photos = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((post: any) => post.imageUrl)
        .map((post: any) => ({
          id: post.id,
          author: post.authorName,
          image: post.imageUrl,
          caption: post.content,
          time: getTimeAgo(post.createdAt)
        }))
        .slice(0, 5);
      
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
      <div className="max-w-7xl mx-auto px-8 py-16">
        
        {/* Welcome Header */}
        <div className="mb-16 text-center">
          <h1 className="text-6xl font-serif text-[#9C2D41] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Welcome back, <span className="italic">{userData?.name?.split(' ')[0] || 'Member'}</span>
          </h1>
          <p className="text-[#CB857C] text-lg font-light italic" style={{ fontFamily: 'Georgia, serif' }}>
            "Here is your personal family schedule"
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          
          {/* PHOTO CAROUSEL (Real Data) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] border border-[#CB857C]/10 overflow-hidden shadow-xl h-[500px] relative group">
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
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-[#9C2D41]/90 via-[#9C2D41]/30 to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 p-10 text-white w-full">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">
                            {item.author}
                          </span>
                          <span className="text-white/80 text-xs font-light italic">• {item.time}</span>
                        </div>
                        <p className="text-4xl font-serif leading-tight line-clamp-2" style={{ fontFamily: 'Georgia, serif' }}>
                          "{item.caption || "A new memory shared"}"
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="absolute bottom-6 right-10 flex gap-2 z-10">
                    {photoFeed.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-1.5 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-[#FAF7F4] text-[#CB857C]">
                  <div className="text-6xl mb-6 opacity-40">📸</div>
                  <h3 className="text-2xl font-serif text-[#9C2D41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>No photos yet</h3>
                  <p className="text-sm font-light italic" style={{ fontFamily: 'Georgia, serif' }}>"Photos posted in the Feed will appear here"</p>
                </div>
              )}
            </div>
          </div>

          {/* Family Stats Card */}
          <div className="bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-[2.5rem] shadow-xl p-10 flex flex-col justify-center space-y-10 text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 space-y-8">
              <div className="text-center pb-8 border-b border-white/20">
                <p className="text-sm uppercase font-bold tracking-widest opacity-90 mb-4">Family Members</p>
                <p className="text-7xl font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                  {familyStats.loading ? '—' : familyStats.totalMembers}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm uppercase font-bold tracking-widest opacity-90 mb-4">Upcoming Events</p>
                <p className="text-7xl font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                  {familyStats.loading ? '—' : familyStats.upcomingEvents}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* My Upcoming Activities */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-serif text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              My Upcoming Activities
            </h2>
            <p className="text-[#CB857C] font-light italic" style={{ fontFamily: 'Georgia, serif' }}>
              "Events you have joined"
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {myUpcomingJios.length > 0 ? (
              myUpcomingJios.map((jio) => (
                <button 
                  key={jio.id} 
                  onClick={() => setSelectedJio(jio)}
                  className="text-center p-8 rounded-[2.5rem] bg-white border border-[#CB857C]/10 shadow-md hover:shadow-2xl hover:border-[#9C2D41]/20 hover:-translate-y-2 transition-all active:scale-95 group"
                >
                  <div className="flex justify-center mb-6">
                    <span className="px-4 py-1.5 rounded-full bg-[#FAF7F4] text-[10px] font-bold text-[#9C2D41] uppercase tracking-widest border border-[#CB857C]/20">
                      {jio.category}
                    </span>
                  </div>
                  <h3 className="text-3xl font-serif text-[#9C2D41] mb-4 group-hover:text-[#CB857C] transition-colors leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    {jio.title}
                  </h3>
                  <p className="text-sm text-[#CB857C] font-light italic line-clamp-2 leading-relaxed mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                    "{jio.description}"
                  </p>
                  <p className="text-xs text-[#9C2D41] font-bold uppercase tracking-wider">
                    {jio.displayDate}
                  </p>
                </button>
              ))
            ) : (
              <div className="col-span-3 py-20 text-center border-2 border-dashed border-[#CB857C]/20 rounded-[2.5rem] bg-white/50">
                <p className="text-[#9C2D41] font-serif text-2xl mb-2" style={{ fontFamily: 'Georgia, serif' }}>No activities scheduled</p>
                <p className="text-[#CB857C] text-sm font-light italic" style={{ fontFamily: 'Georgia, serif' }}>"Check the 'Jio' page to join events"</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pop-up Modal */}
      {selectedJio && (
        <div className="fixed inset-0 bg-[#9C2D41]/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-[#F6CBB7] relative text-center">
            <button 
              onClick={() => setSelectedJio(null)} 
              className="absolute top-8 right-8 text-[#CB857C] text-2xl hover:text-[#9C2D41] transition-colors w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
            
            <div className="mb-10 mt-4">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#FAF7F4] text-[#9C2D41] font-bold text-[10px] mb-6 uppercase tracking-widest border border-[#CB857C]/20">
                {selectedJio.category}
              </span>
              <h2 className="text-4xl font-serif text-[#9C2D41] mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                {selectedJio.title}
              </h2>
              <p className="text-[#CB857C] font-serif text-lg italic leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                "{selectedJio.description}"
              </p>
            </div>

            <div className="space-y-5 mb-10">
              <div className="flex items-center gap-5 bg-[#FAF7F4] p-5 rounded-[1.5rem] border border-[#CB857C]/10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                  {selectedJio.creator[0]}
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-[#CB857C] tracking-wider mb-1">Organized by</p>
                  <p className="font-bold text-[#9C2D41] text-xl">{selectedJio.creator}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-[#FAF7F4] p-5 rounded-[1.5rem] border border-[#CB857C]/10">
                  <p className="text-[10px] uppercase font-bold text-[#CB857C] mb-2 tracking-wider">Time</p>
                  <p className="font-bold text-[#9C2D41] text-xl">{selectedJio.time}</p>
                </div>
                <div className="bg-[#FAF7F4] p-5 rounded-[1.5rem] border border-[#CB857C]/10">
                  <p className="text-[10px] uppercase font-bold text-[#CB857C] mb-2 tracking-wider">Date</p>
                  <p className="font-bold text-[#9C2D41] text-xl">{selectedJio.displayDate}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedJio(null)} 
              className="w-full py-5 bg-[#9C2D41] text-white rounded-[1.5rem] font-bold text-lg shadow-lg hover:bg-[#852233] hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}