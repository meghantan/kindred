'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, addDoc, updateDoc, doc, onSnapshot, query, where, arrayUnion, arrayRemove, Timestamp 
} from 'firebase/firestore';

interface JioEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  creator: string;
  creatorId: string;
  participants: string[];
  maxParticipants?: number | null;
  category: 'meal' | 'activity' | 'errand' | 'other';
  visibility: string;
  familyId: string;
}

export default function OpenJioPage() {
  const { userData } = useAuth();
  
  // Tab and View States
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [viewDate, setViewDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<JioEvent | null>(null); // For Calendar Pop-up
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data States
  const [jioEvents, setJioEvents] = useState<JioEvent[]>([]);
  const [familyBranches, setFamilyBranches] = useState<Record<string, string[]>>({});

  const [newJio, setNewJio] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    category: 'meal' as JioEvent['category'],
    visibility: 'Everyone',
    maxParticipants: ''
  });

  // 1. Fetch Jios for the user's family tree
  useEffect(() => {
    if (!userData?.familyId) return;

    const q = query(collection(db, "jios"), where("familyId", "==", userData.familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events: JioEvent[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
        } as JioEvent);
      });
      setJioEvents(events);
    });

    return () => unsubscribe();
  }, [userData?.familyId]);

  // 2. Fetch and categorize family branches
  useEffect(() => {
    if (!userData?.familyId) return;
    const q = query(collection(db, "users"), where("familyId", "==", userData.familyId));
    
    return onSnapshot(q, (snapshot) => {
      const branches: Record<string, string[]> = {
        'Immediate Family': [],
        'Grandparents': [],
        'Uncles & Aunts': [],
        'Cousins': [],
        'Second/Third Cousins': []
      };

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.uid === userData.uid) return;
        
        const role = d.role?.toLowerCase() || '';
        if (role.includes('grand')) branches['Grandparents'].push(d.name);
        else if (role.includes('second') || role.includes('third')) branches['Second/Third Cousins'].push(d.name);
        else if (role.includes('cousin')) branches['Cousins'].push(d.name);
        else if (role.includes('uncle') || role.includes('aunt')) branches['Uncles & Aunts'].push(d.name);
        else branches['Immediate Family'].push(d.name);
      });

      // Filter out empty branches so they don't appear in the dropdown
      const activeBranches = Object.fromEntries(
        Object.entries(branches).filter(([_, members]) => members.length > 0)
      );
      setFamilyBranches(activeBranches);
    });
  }, [userData]);

  // --- Handlers ---

  const handleCreateJio = async () => {
    if (!newJio.title || !newJio.date || !newJio.time || !userData || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const jioDate = new Date(`${newJio.date}T${newJio.time}`);
      await addDoc(collection(db, "jios"), {
        title: newJio.title,
        description: newJio.description,
        date: Timestamp.fromDate(jioDate),
        time: newJio.time,
        creator: userData.name,
        creatorId: userData.uid,
        participants: [userData.name],
        maxParticipants: newJio.maxParticipants ? parseInt(newJio.maxParticipants) : null,
        category: newJio.category,
        visibility: newJio.visibility,
        familyId: userData.familyId,
        createdAt: Timestamp.now()
      });

      setShowCreateForm(false);
      setNewJio({ title: '', description: '', date: '', time: '', category: 'meal', visibility: 'Everyone', maxParticipants: '' });
    } catch (error) {
      console.error("Error creating Jio:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinJio = async (jioId: string) => {
    if (!userData) return;
    const jioRef = doc(db, "jios", jioId);
    await updateDoc(jioRef, { participants: arrayUnion(userData.name) });
  };

  const handleLeaveJio = async (jioId: string) => {
    if (!userData) return;
    const jioRef = doc(db, "jios", jioId);
    await updateDoc(jioRef, { participants: arrayRemove(userData.name) });
  };

  // --- Calendar Helpers ---
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const getJiosForDay = (day: number) => {
    return jioEvents.filter(event => 
      event.date.getDate() === day &&
      event.date.getMonth() === viewDate.getMonth() &&
      event.date.getFullYear() === viewDate.getFullYear()
    );
  };

  const getUpcomingJios = () => {
    const now = new Date();
    return jioEvents
      .filter(jio => jio.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const categoryIcons = { meal: '🍽️', activity: '🎯', errand: '🛒', other: '📝' };
  const categoryColors = {
    meal: 'bg-orange-100 text-orange-700 border-orange-200',
    activity: 'bg-green-100 text-green-700 border-green-200',
    errand: 'bg-blue-100 text-blue-700 border-blue-200',
    other: 'bg-purple-100 text-purple-700 border-purple-200'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen bg-[#FAF7F4]">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-[#9C2D41]">Open Jio</h1>
          <p className="text-[#CB857C]">Coordinate with your extended family</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-[#CB857C]/20">
            <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'list' ? 'bg-[#9C2D41] text-white shadow-md' : 'text-[#CB857C]'}`}>List View</button>
            <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'calendar' ? 'bg-[#9C2D41] text-white shadow-md' : 'text-[#CB857C]'}`}>Calendar</button>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="bg-[#9C2D41] text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95">+ Create Jio</button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'calendar' ? (
        /* --- CALENDAR VIEW --- */
        <div className="bg-white rounded-3xl border border-[#CB857C]/20 overflow-hidden shadow-xl">
          <div className="p-6 flex justify-between items-center bg-[#FAF7F4]">
            <h2 className="text-2xl font-bold text-[#9C2D41]">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-2 text-[#9C2D41]">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2 hover:bg-[#F6CBB7]/20 rounded-lg">◀</button>
              <button onClick={() => setViewDate(new Date())} className="px-4 py-1 text-sm font-bold border border-[#CB857C]/40 rounded-lg">Today</button>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2 hover:bg-[#F6CBB7]/20 rounded-lg">▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center py-4 border-b border-[#CB857C]/10 text-xs font-bold uppercase text-[#CB857C] tracking-widest">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-32 border-b border-r border-[#FAF7F4] bg-[#FAF7F4]/30" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayJios = getJiosForDay(day);
              const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
              
              return (
                <div key={day} className="h-32 border-b border-r border-[#FAF7F4] p-2 hover:bg-[#F6CBB7]/10 transition-colors relative group">
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#9C2D41] text-white' : 'text-[#CB857C]'}`}>{day}</span>
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-[85px] scrollbar-hide">
                    {dayJios.map(jio => (
                      <button 
                        key={jio.id} 
                        onClick={() => setSelectedEvent(jio)}
                        className="w-full text-left text-[10px] p-1.5 rounded-lg bg-[#F6CBB7]/20 border border-[#CB857C]/20 text-[#9C2D41] truncate font-bold hover:bg-[#F6CBB7]/40 transition-all"
                      >
                        {categoryIcons[jio.category]} {jio.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* --- LIST VIEW --- */
        <div className="space-y-6">
          {getUpcomingJios().length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-[#CB857C]/20 rounded-3xl text-[#CB857C] italic">No family activities jio-ed yet.</div>
          ) : (
            getUpcomingJios().map(jio => (
              <div key={jio.id} className="bg-white rounded-2xl border border-[#CB857C]/20 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryColors[jio.category]}`}>
                        {categoryIcons[jio.category]} {jio.category.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 bg-[#FAF7F4] text-[#CB857C] rounded-lg border border-[#CB857C]/10">🔒 {jio.visibility}</span>
                      <span className="text-sm text-[#CB857C]">by <span className="font-bold text-[#9C2D41]">{jio.creator}</span></span>
                    </div>
                    <h3 className="text-2xl font-bold text-[#9C2D41] mb-1">{jio.title}</h3>
                    <p className="text-[#CB857C] mb-4 leading-relaxed">{jio.description}</p>
                    <div className="flex flex-wrap gap-6 text-sm text-[#CB857C] font-medium">
                      <span>🗓️ {jio.date.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span>🕐 {jio.time}</span>
                      <span className="text-[#9C2D41] font-bold">👥 {jio.participants.length} Joined {jio.maxParticipants ? `/ ${jio.maxParticipants}` : ''}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {jio.participants.includes(userData?.name || '') ? (
                      <button onClick={() => handleLeaveJio(jio.id)} className="px-6 py-2 bg-white text-rose-600 rounded-xl text-sm font-bold border border-rose-100 hover:bg-rose-50 transition-colors">Leave Jio</button>
                    ) : (
                      <button 
                        onClick={() => handleJoinJio(jio.id)} 
                        disabled={jio.maxParticipants ? jio.participants.length >= jio.maxParticipants : false}
                        className="px-6 py-2 bg-[#9C2D41] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#7D2434] transition-colors disabled:opacity-50"
                      >Join Jio</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-[#1E1E20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E20] text-zinc-100 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-zinc-800">
            <h2 className="text-2xl font-bold mb-6">Create New Jio</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Title</label>
                <input type="text" value={newJio.title} onChange={e => setNewJio({...newJio, title: e.target.value})} className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#5D5FEF] transition-all" placeholder="What's the plan?" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                <textarea value={newJio.description} onChange={e => setNewJio({...newJio, description: e.target.value})} className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] rounded-xl border-none outline-none resize-none focus:ring-2 focus:ring-[#5D5FEF]" rows={2} placeholder="Add some details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</label>
                  <input type="date" value={newJio.date} onChange={e => setNewJio({...newJio, date: e.target.value})} className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] border-none rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Time</label>
                  <input type="time" value={newJio.time} onChange={e => setNewJio({...newJio, time: e.target.value})} className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] border-none rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Visibility Branch</label>
                  <select 
                    value={newJio.visibility} 
                    onChange={e => setNewJio({...newJio, visibility: e.target.value})} 
                    className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#5D5FEF]"
                  >
                    <option value="Everyone">Everyone in Family</option>
                    {Object.entries(familyBranches).map(([branch, members]) => (
                      <option key={branch} value={branch}>{branch} ({members.length})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</label>
                  <select value={newJio.category} onChange={e => setNewJio({...newJio, category: e.target.value as JioEvent['category']})} className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] rounded-xl border-none">
                    <option value="meal">🍽️ Meal</option>
                    <option value="activity">🎯 Activity</option>
                    <option value="errand">🛒 Errand</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Max People (Optional)</label>
                <input type="number" value={newJio.maxParticipants} onChange={e => setNewJio({...newJio, maxParticipants: e.target.value})} className="w-full mt-1.5 px-4 py-3 bg-[#2A2A2D] border-none rounded-xl" placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowCreateForm(false)} className="flex-1 py-3 bg-[#3A3A3D] rounded-xl font-bold hover:bg-[#4A4A4D] transition-colors">Cancel</button>
              <button 
                onClick={handleCreateJio} 
                disabled={isSubmitting}
                className="flex-1 bg-[#5D5FEF] py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Confirming...' : 'Launch Jio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal (Triggered from Calendar click) */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[#CB857C]/20 text-center">
            <div className="inline-block px-3 py-1.5 rounded-xl bg-[#F6CBB7]/20 text-[#9C2D41] font-bold text-xs mb-4 border border-[#CB857C]/20">
              {categoryIcons[selectedEvent.category]} {selectedEvent.category.toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold text-[#9C2D41] mb-2">{selectedEvent.title}</h2>
            <p className="text-[#CB857C] mb-6 font-light">{selectedEvent.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-[#CB857C] mb-8">
              <div className="bg-[#FAF7F4] p-3 rounded-2xl border border-[#CB857C]/10">
                <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">When</p>
                <p className="font-bold">{selectedEvent.time}</p>
                <p>{selectedEvent.date.toLocaleDateString()}</p>
              </div>
              <div className="bg-[#FAF7F4] p-3 rounded-2xl border border-[#CB857C]/10">
                <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Participants</p>
                <p className="font-bold text-[#9C2D41]">{selectedEvent.participants.length} Joined</p>
                <p className="text-xs">by {selectedEvent.creator}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedEvent(null)} className="flex-1 py-3 bg-[#FAF7F4] text-[#CB857C] rounded-xl font-bold border border-[#CB857C]/20 hover:bg-[#F6CBB7]/10 transition-colors">Close</button>
              {selectedEvent.participants.includes(userData?.name || '') ? (
                <button 
                  onClick={() => { handleLeaveJio(selectedEvent.id); setSelectedEvent(null); }}
                  className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold border border-rose-100"
                >Leave</button>
              ) : (
                <button 
                  onClick={() => { handleJoinJio(selectedEvent.id); setSelectedEvent(null); }}
                  disabled={selectedEvent.maxParticipants ? selectedEvent.participants.length >= selectedEvent.maxParticipants : false}
                  className="flex-1 py-3 bg-[#9C2D41] text-white rounded-xl font-bold shadow-md hover:bg-[#7D2434] transition-colors disabled:opacity-50"
                >Join</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}