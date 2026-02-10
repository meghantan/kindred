'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, arrayUnion, arrayRemove, Timestamp, serverTimestamp 
} from 'firebase/firestore';

// --- SVG Components ---
const Icons = {
  Meal: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Errand: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Other: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

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

interface MemberInfo {
  name: string;
  uid: string;
}

export default function OpenJioPage() {
  const { userData } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [viewDate, setViewDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<JioEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [jioEvents, setJioEvents] = useState<JioEvent[]>([]);
  const [familyBranches, setFamilyBranches] = useState<Record<string, MemberInfo[]>>({});
  const [allOtherMembers, setAllOtherMembers] = useState<MemberInfo[]>([]);

  const [formState, setFormState] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    category: 'meal' as JioEvent['category'],
    visibility: 'Everyone',
    maxParticipants: ''
  });

  useEffect(() => {
    if (!userData?.familyId) return;
    const q = query(collection(db, "jios"), where("familyId", "==", userData.familyId));
    return onSnapshot(q, (snapshot) => {
      const events: JioEvent[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
        } as JioEvent;
      });
      setJioEvents(events);
    });
  }, [userData?.familyId]);

  useEffect(() => {
    if (!userData?.familyId) return;
    const q = query(collection(db, "users"), where("familyId", "==", userData.familyId));
    return onSnapshot(q, (snapshot) => {
      const branches: Record<string, MemberInfo[]> = { 'Immediate Family': [], 'Grandparents': [], 'Uncles & Aunts': [], 'Cousins': [], 'Second/Third Cousins': [] };
      const all: MemberInfo[] = [];

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.uid === userData.uid) return;
        
        const member = { name: d.name, uid: d.uid };
        all.push(member);

        const role = d.role?.toLowerCase() || '';
        if (role.includes('grand')) branches['Grandparents'].push(member);
        else if (role.includes('second') || role.includes('third')) branches['Second/Third Cousins'].push(member);
        else if (role.includes('cousin')) branches['Cousins'].push(member);
        else if (role.includes('uncle') || role.includes('aunt')) branches['Uncles & Aunts'].push(member);
        else branches['Immediate Family'].push(member);
      });

      setAllOtherMembers(all);
      setFamilyBranches(Object.fromEntries(Object.entries(branches).filter(([_, m]) => m.length > 0)));
    });
  }, [userData]);

  // Unified notification helper
  const sendNotificationChats = async (invitedMembers: MemberInfo[], message: string) => {
    if (!userData || invitedMembers.length === 0) return;

    const promises = invitedMembers.map(async (member) => {
      const chatId = [userData.uid, member.uid].sort().join('_');
      return addDoc(collection(db, "chats", chatId, "messages"), {
        text: message,
        senderId: userData.uid,
        createdAt: serverTimestamp(),
      });
    });

    await Promise.all(promises);
  };

  const handleCreateOrUpdateJio = async () => {
    if (!formState.title || !formState.date || !formState.time || !userData || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const jioDate = new Date(`${formState.date}T${formState.time}`);
      const payload = {
        title: formState.title,
        description: formState.description,
        date: Timestamp.fromDate(jioDate),
        time: formState.time,
        category: formState.category,
        visibility: formState.visibility,
        maxParticipants: formState.maxParticipants ? parseInt(formState.maxParticipants) : null,
      };

      // Identify recipients
      let membersToNotify: MemberInfo[] = [];
      if (formState.visibility === 'Everyone') {
        membersToNotify = allOtherMembers;
      } else if (familyBranches[formState.visibility]) {
        membersToNotify = familyBranches[formState.visibility];
      }

      if (isEditing && selectedEvent) {
        await updateDoc(doc(db, "jios", selectedEvent.id), payload);
        const updateMsg = `${userData.name} updated the details for "${formState.title}" on ${formState.date}. Please check the app for the new schedule.`;
        await sendNotificationChats(membersToNotify, updateMsg);
      } else {
        await addDoc(collection(db, "jios"), {
          ...payload,
          creator: userData.name,
          creatorId: userData.uid,
          participants: [userData.name],
          familyId: userData.familyId,
          createdAt: Timestamp.now()
        });
        const inviteMsg = `${userData.name} invited you to "${formState.title}" on ${formState.date} at ${formState.time}. Respond to their invite!`;
        await sendNotificationChats(membersToNotify, inviteMsg);
      }

      setShowCreateForm(false);
      setIsEditing(false);
      setFormState({ title: '', description: '', date: '', time: '', category: 'meal', visibility: 'Everyone', maxParticipants: '' });
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteJio = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Jio?") || !selectedEvent) return;
    try {
      let membersToNotify: MemberInfo[] = [];
      if (selectedEvent.visibility === 'Everyone') {
        membersToNotify = allOtherMembers;
      } else if (familyBranches[selectedEvent.visibility]) {
        membersToNotify = familyBranches[selectedEvent.visibility];
      }

      const cancelMsg = `${userData?.name} cancelled the activity: "${selectedEvent.title}" originally scheduled for ${selectedEvent.time} on ${selectedEvent.date.toLocaleDateString()}.`;
      await sendNotificationChats(membersToNotify, cancelMsg);

      await deleteDoc(doc(db, "jios", id));
      setSelectedEvent(null);
    } catch (e) { console.error(e); }
  };

  const openEditForm = (jio: JioEvent) => {
    setFormState({
      title: jio.title,
      description: jio.description,
      date: jio.date.toISOString().split('T')[0],
      time: jio.time,
      category: jio.category,
      visibility: jio.visibility,
      maxParticipants: jio.maxParticipants?.toString() || ''
    });
    setSelectedEvent(jio);
    setIsEditing(true);
    setShowCreateForm(true);
  };

  const handleJoinJio = async (id: string) => userData && await updateDoc(doc(db, "jios", id), { participants: arrayUnion(userData.name) });
  const handleLeaveJio = async (id: string) => userData && await updateDoc(doc(db, "jios", id), { participants: arrayRemove(userData.name) });

  const categorySVGs = {
    meal: <Icons.Meal />,
    activity: <Icons.Activity />,
    errand: <Icons.Errand />,
    other: <Icons.Other />
  };

  const categoryColors = { 
    meal: 'bg-orange-50 text-orange-700 border-orange-200', 
    activity: 'bg-green-50 text-green-700 border-green-200', 
    errand: 'bg-blue-50 text-blue-700 border-blue-200', 
    other: 'bg-purple-50 text-purple-700 border-purple-200' 
  };

  const myJios = jioEvents.filter(e => e.creatorId === userData?.uid).sort((a,b) => b.date.getTime() - a.date.getTime());
  const otherUpcomingJios = jioEvents.filter(e => e.creatorId !== userData?.uid && e.date >= new Date()).sort((a,b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-5xl font-normal text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Open Jio</h1>
          <p className="text-[#CB857C] text-base font-normal">Stay connected through shared experiences</p>
        </div>
        <div className="flex gap-3 items-start">
          <div className="flex bg-white p-1 rounded-2xl shadow-md border-2 border-[#CB857C]/20">
            <button 
              onClick={() => setActiveTab('list')} 
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'list' ? 'bg-[#9C2D41] text-white shadow-sm' : 'text-[#9C2D41] hover:text-[#9C2D41]'}`}
            >
              List View
            </button>
            <button 
              onClick={() => setActiveTab('calendar')} 
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'calendar' ? 'bg-[#9C2D41] text-white shadow-sm' : 'text-[#9C2D41] hover:text-[#9C2D41]'}`}
            >
              Calendar
            </button>
          </div>
          <button 
            onClick={() => { setIsEditing(false); setShowCreateForm(true); }} 
            className="bg-[#9C2D41] text-white px-7 py-2.5 rounded-2xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            Create Jio
          </button>
        </div>
      </div>

      {activeTab === 'calendar' ? (
        /* --- CALENDAR VIEW --- */
        <div className="bg-white rounded-3xl border-2 border-[#CB857C]/20 overflow-hidden shadow-xl">
          <div className="p-8 flex justify-between items-center bg-[#FAF7F4] border-b border-[#CB857C]/10">
            <h2 className="text-2xl font-light text-[#9C2D41]" style={{ fontFamily: 'Georgia, serif' }}>
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-3">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2 text-[#9C2D41] hover:bg-white rounded-xl transition-colors">
                <Icons.ChevronLeft />
              </button>
              <button onClick={() => setViewDate(new Date())} className="px-4 py-2 text-sm font-medium border border-[#CB857C]/30 rounded-xl text-[#9C2D41] hover:bg-white transition-colors">
                Today
              </button>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2 text-[#9C2D41] hover:bg-white rounded-xl transition-colors">
                <Icons.ChevronRight />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center py-4 border-b border-[#CB857C]/10 text-xs font-medium uppercase text-[#CB857C]/80 tracking-wider bg-[#FAF7F4]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => 
              <div key={i} className="h-32 border-b border-r border-[#FAF7F4] bg-[#FAF7F4]/50" />
            )}
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1; 
              const dayJios = jioEvents.filter(e => 
                e.date.getDate() === day && 
                e.date.getMonth() === viewDate.getMonth() && 
                e.date.getFullYear() === viewDate.getFullYear()
              );
              const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
              
              return (
                <div key={day} className="h-32 border-b border-r border-[#FAF7F4] p-3 hover:bg-[#F6CBB7]/10 transition-colors">
                  <span className={`text-sm font-medium inline-flex items-center justify-center ${
                    isToday 
                      ? 'bg-[#9C2D41] text-white w-7 h-7 rounded-full' 
                      : 'text-[#CB857C]'
                  }`}>
                    {day}
                  </span>
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-[85px]">
                    {dayJios.map(jio => (
                      <button 
                        key={jio.id} 
                        onClick={() => setSelectedEvent(jio)} 
                        className="w-full text-left text-[10px] p-1.5 rounded-lg bg-[#F6CBB7]/20 border border-[#CB857C]/20 text-[#9C2D41] truncate font-medium flex items-center gap-1 hover:bg-[#F6CBB7]/30 transition-colors"
                      >
                        {categorySVGs[jio.category]} 
                        <span className="truncate">{jio.title}</span>
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
        <div className="space-y-12">
          {myJios.length > 0 && (
            <section>
              <h2 className="text-2xl font-normal text-[#9C2D41] mb-6 flex items-center gap-3" style={{ fontFamily: 'Georgia, serif' }}>
                <Icons.User /> My Jios
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myJios.map(jio => (
                  <div 
                    key={jio.id} 
                    onClick={() => setSelectedEvent(jio)} 
                    className="bg-white rounded-2xl border-2 border-[#CB857C]/20 p-6 shadow-md hover:shadow-lg cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${categoryColors[jio.category]}`}>
                        {categorySVGs[jio.category]} {jio.category.toUpperCase()}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditForm(jio); }} 
                        className="text-[#9C2D41] text-sm font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <h3 className="text-xl font-medium text-[#9C2D41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                      {jio.title}
                    </h3>
                    <p className="text-sm text-[#CB857C] font-normal">
                      {jio.date.toLocaleDateString()} • {jio.time}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-normal text-[#9C2D41] mb-6 flex items-center gap-3" style={{ fontFamily: 'Georgia, serif' }}>
              <Icons.Calendar /> Family Activity Feed
            </h2>
            <div className="space-y-6">
              {otherUpcomingJios.map(jio => (
                <div 
                  key={jio.id} 
                  onClick={() => setSelectedEvent(jio)} 
                  className="bg-white rounded-2xl border-2 border-[#CB857C]/20 p-8 shadow-md hover:shadow-lg cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${categoryColors[jio.category]}`}>
                          {categorySVGs[jio.category]} {jio.category.toUpperCase()}
                        </span>
                        <span className="text-sm text-[#CB857C]">
                          by <span className="font-semibold text-[#9C2D41]">{jio.creator}</span>
                        </span>
                      </div>
                      <h3 className="text-2xl font-medium text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                        {jio.title}
                      </h3>
                      <p className="text-[#CB857C] leading-relaxed mb-4">{jio.description}</p>
                      <div className="flex gap-6 text-sm text-[#CB857C] font-normal">
                        <span>🗓️ {jio.date.toLocaleDateString()}</span>
                        <span>🕐 {jio.time}</span>
                        <span className="text-[#9C2D41] font-semibold">👥 {jio.participants.length} Joined</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-[#CB857C]/20 relative">
            <button 
              onClick={() => { setShowCreateForm(false); setIsEditing(false); }} 
              className="absolute top-6 right-6 text-[#CB857C] hover:text-[#9C2D41] transition-colors"
            >
              <Icons.X />
            </button>
            
            <div className="mb-8">
              <h2 className="text-3xl font-normal text-[#9C2D41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                {isEditing ? 'Edit Jio' : 'Create New Jio'}
              </h2>
              <p className="text-[#CB857C] text-sm font-normal">Plan your next family gathering</p>
            </div>

            <div className="space-y-5 mb-8">
              <div>
                <label className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider block mb-2">
                  Activity Title
                </label>
                <input 
                  type="text" 
                  value={formState.title} 
                  onChange={e => setFormState({...formState, title: e.target.value})} 
                  className="w-full px-4 py-3.5 bg-white rounded-2xl outline-none focus:ring-2 focus:ring-[#9C2D41]/30 border-2 border-[#CB857C]/20 text-[#9C2D41] font-normal transition-all shadow-sm"
                  placeholder="e.g., Sunday Brunch"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider block mb-2">
                  Description
                </label>
                <textarea 
                  value={formState.description} 
                  onChange={e => setFormState({...formState, description: e.target.value})} 
                  className="w-full px-4 py-3.5 bg-white rounded-2xl outline-none border-2 border-[#CB857C]/20 resize-none text-[#9C2D41] transition-all focus:ring-2 focus:ring-[#9C2D41]/30 shadow-sm" 
                  rows={3}
                  placeholder="Add details about your activity..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider block mb-2">
                    Date
                  </label>
                  <input 
                    type="date" 
                    value={formState.date} 
                    onChange={e => setFormState({...formState, date: e.target.value})} 
                    className="w-full px-4 py-3.5 bg-white rounded-2xl border-2 border-[#CB857C]/20 text-[#9C2D41] outline-none focus:ring-2 focus:ring-[#9C2D41]/30 transition-all shadow-sm font-normal"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider block mb-2">
                    Time
                  </label>
                  <input 
                    type="time" 
                    value={formState.time} 
                    onChange={e => setFormState({...formState, time: e.target.value})} 
                    className="w-full px-4 py-3.5 bg-white rounded-2xl border-2 border-[#CB857C]/20 text-[#9C2D41] outline-none focus:ring-2 focus:ring-[#9C2D41]/30 transition-all shadow-sm font-normal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider block mb-2">
                    Category
                  </label>
                  <div className="relative">
                    <select 
                      value={formState.category} 
                      onChange={e => setFormState({...formState, category: e.target.value as any})} 
                      className="w-full px-4 py-3.5 bg-white rounded-2xl outline-none border-2 border-[#CB857C]/20 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/30 transition-all appearance-none shadow-sm font-normal cursor-pointer"
                    >
                      <option value="meal">Meal</option>
                      <option value="activity">Activity</option>
                      <option value="errand">Errand</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9C2D41]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider block mb-2">
                    Visibility
                  </label>
                  <div className="relative">
                    <select 
                      value={formState.visibility} 
                      onChange={e => setFormState({...formState, visibility: e.target.value})} 
                      className="w-full px-4 py-3.5 bg-white rounded-2xl outline-none border-2 border-[#CB857C]/20 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/30 transition-all appearance-none shadow-sm font-normal cursor-pointer"
                    >
                      <option value="Everyone">Everyone</option>
                      {Object.keys(familyBranches).map(branchName => 
                        <option key={branchName} value={branchName}>{branchName}</option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9C2D41]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowCreateForm(false); setIsEditing(false); }} 
                className="flex-1 py-4 bg-white text-[#9C2D41] rounded-2xl font-semibold border-2 border-[#CB857C]/30 hover:bg-[#FAF7F4] transition-all shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateOrUpdateJio} 
                disabled={isSubmitting} 
                className="flex-1 bg-[#9C2D41] text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all active:scale-95"
              >
                {isEditing ? 'Update Jio' : 'Launch Jio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedEvent && !showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-[#CB857C]/20 relative">
            <button 
              onClick={() => setSelectedEvent(null)} 
              className="absolute top-6 right-6 text-[#CB857C] hover:text-[#9C2D41] transition-colors"
            >
              <Icons.X />
            </button>
            
            <div className="text-center mb-8">
              <div className="inline-flex px-3 py-1.5 rounded-xl bg-[#F6CBB7]/20 text-[#9C2D41] font-medium text-xs mb-4 uppercase tracking-wider border border-[#CB857C]/20 items-center gap-1.5">
                {categorySVGs[selectedEvent.category]} {selectedEvent.category}
              </div>
              <h2 className="text-3xl font-light text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                {selectedEvent.title}
              </h2>
              {selectedEvent.description && (
                <p className="text-[#CB857C]/80 leading-relaxed">{selectedEvent.description}</p>
              )}
            </div>

            <div className="space-y-5 mb-10">
              <div className="flex items-center gap-4 bg-[#FAF7F4] p-5 rounded-2xl border border-[#CB857C]/10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white rounded-full flex items-center justify-center font-medium shadow-md text-lg">
                  {selectedEvent.creator[0]}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#CB857C]/80 uppercase tracking-wider">Organized by</p>
                  <p className="font-normal text-[#9C2D41] mt-0.5">{selectedEvent.creator}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FAF7F4] p-5 rounded-2xl border border-[#CB857C]/10 text-center">
                  <p className="text-xs font-medium text-[#CB857C]/80 uppercase tracking-wider mb-2">Time</p>
                  <p className="font-normal text-[#9C2D41]">{selectedEvent.time}</p>
                </div>
                <div className="bg-[#FAF7F4] p-5 rounded-2xl border border-[#CB857C]/10 text-center">
                  <p className="text-xs font-medium text-[#CB857C]/80 uppercase tracking-wider mb-2">Date</p>
                  <p className="font-normal text-[#9C2D41]">{selectedEvent.date.toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-[#FAF7F4] p-5 rounded-2xl border border-[#CB857C]/10">
                <p className="text-xs font-medium text-[#CB857C]/80 uppercase tracking-wider mb-3">
                  Participants ({selectedEvent.participants.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.participants.map((person, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1.5 bg-white border border-[#CB857C]/20 rounded-full text-xs font-medium text-[#9C2D41]"
                    >
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              {selectedEvent.creatorId === userData?.uid ? (
                <>
                  <button 
                    onClick={() => { handleDeleteJio(selectedEvent!.id); }} 
                    className="flex-1 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-medium border border-rose-100 hover:bg-rose-100 transition-all"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => { openEditForm(selectedEvent!); }} 
                    className="flex-1 bg-[#9C2D41] text-white py-3.5 rounded-2xl font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setSelectedEvent(null)} 
                    className="flex-1 py-3.5 bg-[#FAF7F4] text-[#CB857C] rounded-2xl font-medium border border-[#CB857C]/20 hover:bg-[#F6CBB7]/20 transition-all"
                  >
                    Close
                  </button>
                  {selectedEvent.participants.includes(userData?.name || '') ? (
                    <button 
                      onClick={() => { handleLeaveJio(selectedEvent!.id); setSelectedEvent(null); }} 
                      className="flex-1 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-medium border border-rose-100 shadow-sm hover:bg-rose-100 transition-all"
                    >
                      Leave
                    </button>
                  ) : (
                    <button 
                      onClick={() => { handleJoinJio(selectedEvent!.id); setSelectedEvent(null); }} 
                      className="flex-1 py-3.5 bg-[#9C2D41] text-white rounded-2xl font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      Join
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}