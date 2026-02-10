'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, 
  query, 
  where, 
  Timestamp, 
  onSnapshot 
} from 'firebase/firestore';

export default function Dashboard() {
  const { userData } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [myUpcomingJios, setMyUpcomingJios] = useState<any[]>([]);
  const [recentFamilyActivities, setRecentFamilyActivities] = useState<any[]>([]);
  const [selectedJio, setSelectedJio] = useState<any | null>(null); 
  const [familyStats, setFamilyStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    loading: true
  });

  // 1. Live Data Fetching Logic
  useEffect(() => {
    if (!userData?.familyId) return;

    const fid = userData.familyId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch total family members
    const membersQuery = query(collection(db, "users"), where("familyId", "==", fid));
    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      setFamilyStats(prev => ({ ...prev, totalMembers: snapshot.size }));
    });

    // Fetch Jios I have joined
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

    // Fetch Recent Activity for the general feed
    const recentQuery = query(collection(db, "jios"), where("familyId", "==", fid));
    const unsubRecent = onSnapshot(recentQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 3);
      setRecentFamilyActivities(activities);
    });

    return () => {
      unsubMembers();
      unsubMyJios();
      unsubRecent();
    };
  }, [userData]);

  // Carousel Data
  const feedItems = [
    { id: 1, author: 'Mom', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop', caption: 'Beautiful family dinner tonight', time: '2 hours ago' },
    { id: 2, author: 'Dad', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop', caption: 'Weekend dim sum adventure', time: '5 hours ago' }
  ];

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % feedItems.length), 5000);
    return () => clearInterval(interval);
  }, [feedItems.length]);

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-20"> {/* Fixed Background */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-light text-[#9C2D41] mb-3 tracking-tight">
            Welcome back, <span className="font-normal">{userData?.name?.split(' ')[0] || 'Member'}</span>
          </h1>
          <p className="text-[#CB857C]/70 text-lg font-light">Here is your personal family schedule.</p>
        </div>

        {/* Stats & Carousel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-[#CB857C]/20 overflow-hidden shadow-lg h-96">
              <div className="relative h-full">
                {feedItems.map((item, index) => (
                  <div key={item.id} className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={item.image} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#9C2D41]/90 via-transparent to-transparent" />
                    <div className="absolute bottom-0 p-8 text-white">
                      <p className="text-sm font-medium mb-1">{item.author} • {item.time}</p>
                      <p className="text-2xl font-light">{item.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-3xl shadow-xl p-8 flex flex-col justify-center space-y-6 text-white">
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span className="text-sm font-light opacity-90 uppercase tracking-widest">Family Members</span>
              <span className="text-4xl font-light">{familyStats.loading ? '—' : familyStats.totalMembers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-light opacity-90 uppercase tracking-widest">My Upcoming Jios</span>
              <span className="text-4xl font-light">{familyStats.loading ? '—' : familyStats.upcomingEvents}</span>
            </div>
          </div>
        </div>

        {/* My Upcoming Activities */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#9C2D41]/10 rounded-xl flex items-center justify-center border border-[#9C2D41]/20">
              <span className="text-xl">📅</span>
            </div>
            <h2 className="text-3xl font-light text-[#9C2D41]">My Upcoming Activities</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {myUpcomingJios.length > 0 ? (
              myUpcomingJios.map((jio) => (
                <button 
                  key={jio.id} 
                  onClick={() => setSelectedJio(jio)}
                  className="text-left p-6 rounded-2xl bg-white border border-[#CB857C]/20 shadow-sm hover:shadow-md hover:border-[#9C2D41]/40 transition-all active:scale-95 group"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-2 py-1 rounded-lg bg-[#FAF7F4] text-[10px] font-bold text-[#9C2D41] uppercase border border-[#CB857C]/10">{jio.category}</span>
                    <span className="text-[10px] text-[#CB857C] font-bold uppercase">{jio.displayDate}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#9C2D41] mb-1 group-hover:underline">{jio.title}</h3>
                  <p className="text-sm text-[#CB857C] font-light line-clamp-2">{jio.description}</p>
                </button>
              ))
            ) : (
              <div className="col-span-3 py-12 text-center border-2 border-dashed border-[#CB857C]/20 rounded-3xl text-[#CB857C] italic">No joined activities.</div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-[#CB857C]/20 shadow-lg">
          <h2 className="text-2xl font-normal text-[#9C2D41] mb-8 flex items-center gap-3">
            <span className="text-xl">🚀</span> Recent Family Activity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentFamilyActivities.map((activity) => (
              <div key={activity.id} className="p-4 rounded-xl bg-[#F6CBB7]/10 border border-[#CB857C]/10">
                <p className="text-sm font-light text-[#9C2D41] mb-1">
                  <span className="font-bold">{activity.creator}</span> jio-ed: {activity.title}
                </p>
                <span className="text-[10px] text-[#CB857C]/60 font-light">Just now</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Activity Details Pop-up */}
      {selectedJio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[#CB857C]/20 relative text-left">
            <button onClick={() => setSelectedJio(null)} className="absolute top-4 right-6 text-[#CB857C] text-2xl font-light hover:text-[#9C2D41]">×</button>
            
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1.5 rounded-xl bg-[#F6CBB7]/20 text-[#9C2D41] font-bold text-xs mb-4 uppercase tracking-widest border border-[#CB857C]/20">
                {selectedJio.category}
              </div>
              <h2 className="text-3xl font-bold text-[#9C2D41] mb-2">{selectedJio.title}</h2>
              <p className="text-[#CB857C] mb-2 font-light text-lg italic leading-tight">"{selectedJio.description}"</p>
            </div>

            <div className="space-y-4 mb-8">
              {/* 1. Creator Info */}
              <div className="flex items-center gap-3 bg-[#FAF7F4] p-4 rounded-2xl border border-[#CB857C]/10">
                <div className="w-10 h-10 bg-[#9C2D41] text-white rounded-full flex items-center justify-center font-bold shadow-md">
                  {selectedJio.creator[0]}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Organized by</p>
                  <p className="font-bold text-[#9C2D41]">{selectedJio.creator}</p>
                </div>
              </div>

              {/* 2. Activity Time and Date */}
              <div className="grid grid-cols-2 gap-4 text-sm text-[#CB857C]">
                <div className="bg-[#FAF7F4] p-4 rounded-2xl border border-[#CB857C]/10 text-center">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Time</p>
                  <p className="font-bold text-[#9C2D41]">{selectedJio.time}</p>
                </div>
                <div className="bg-[#FAF7F4] p-4 rounded-2xl border border-[#CB857C]/10 text-center">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Date</p>
                  <p className="font-bold text-[#9C2D41]">{selectedJio.displayDate}</p>
                </div>
              </div>

              {/* 3. List of Participants */}
              <div className="bg-[#FAF7F4] p-4 rounded-2xl border border-[#CB857C]/10">
                <p className="text-[10px] uppercase font-bold text-zinc-400 mb-2 tracking-widest">Joining the activity ({selectedJio.participants.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedJio.participants.map((person: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-white border border-[#CB857C]/20 rounded-full text-xs font-bold text-[#9C2D41]">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedJio(null)} 
              className="w-full py-4 bg-[#9C2D41] text-white rounded-2xl font-bold shadow-lg hover:bg-[#7D2434] transition-all"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}