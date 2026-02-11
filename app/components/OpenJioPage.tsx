'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, arrayUnion, arrayRemove, Timestamp, serverTimestamp 
} from 'firebase/firestore';

// --- ICONS ---
const Icons = {
  Meal: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Activity: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Errand: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  Other: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  ChevronLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>,
  X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
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

interface DisplayMember {
  name: string;
  uid: string;
  photoURL?: string;
  generation?: number;
}

const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  date: '',
  time: '',
  category: 'meal' as JioEvent['category'],
  visibility: 'Everyone',
  maxParticipants: ''
};

export default function OpenJioPage() {
  const { userData, familyMembers, getRelationshipLabel } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [viewDate, setViewDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<JioEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jioEvents, setJioEvents] = useState<JioEvent[]>([]);
  const [visibilityGroups, setVisibilityGroups] = useState<Record<string, DisplayMember[]>>({});
  const [memberMap, setMemberMap] = useState<Record<string, DisplayMember>>({});
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);

  const categorySVGs = {
    meal: <Icons.Meal />,
    activity: <Icons.Activity />,
    errand: <Icons.Errand />,
    other: <Icons.Other />
  };

  const categoryColors = { 
    meal: 'bg-orange-50 text-orange-700 border-orange-100', 
    activity: 'bg-green-50 text-green-700 border-green-100', 
    errand: 'bg-blue-50 text-blue-700 border-blue-100', 
    other: 'bg-purple-50 text-purple-700 border-purple-100' 
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('m')) return timeStr;
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h}:${minutes} ${ampm}`;
  };

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
    if (!familyMembers || !userData) return;
    const map: Record<string, DisplayMember> = {};
    const others = familyMembers.filter((m: any) => m.uid !== userData.uid);
    familyMembers.forEach((m: any) => {
      map[m.name] = { name: m.name, uid: m.uid, photoURL: m.photoURL, generation: m.generation };
    });
    setMemberMap(map);
    const maxGen = Math.max(...familyMembers.map((m: any) => m.generation || 0));
    const groups: Record<string, DisplayMember[]> = {
      'Everyone': others,
      'Immediate Family': others.filter((m: any) => {
        const rel = getRelationshipLabel(m.uid);
        return ['Parent', 'Sibling', 'Child'].includes(rel);
      }),
      'Peers': others.filter((m: any) => m.generation === userData.generation),
      'Youths': others.filter((m: any) => m.generation >= maxGen - 1),
    };
    setVisibilityGroups(groups);
  }, [familyMembers, userData, getRelationshipLabel]);

  const sendNotificationChats = async (invitedMembers: DisplayMember[], message: string) => {
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

  const handleOpenCreate = () => {
    setFormState(INITIAL_FORM_STATE);
    setIsEditing(false);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setIsEditing(false);
    setSelectedEvent(null);
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
      const recipients = visibilityGroups[formState.visibility] || visibilityGroups['Everyone'];
      if (isEditing && selectedEvent) {
        await updateDoc(doc(db, "jios", selectedEvent.id), payload);
        const updateMsg = `${userData.name} updated details for "${formState.title}" on ${formState.date}.`;
        await sendNotificationChats(recipients, updateMsg);
      } else {
        await addDoc(collection(db, "jios"), {
          ...payload,
          creator: userData.name,
          creatorId: userData.uid,
          participants: [userData.name],
          familyId: userData.familyId,
          createdAt: Timestamp.now()
        });
        const inviteMsg = `${userData.name} invited you to "${formState.title}" on ${formState.date}.`;
        await sendNotificationChats(recipients, inviteMsg);
      }
      handleCloseForm();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleDeleteJio = async (id: string) => {
    if (!window.confirm("Delete this Jio?") || !selectedEvent) return;
    try {
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

  const handleJoinJio = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(userData) await updateDoc(doc(db, "jios", id), { participants: arrayUnion(userData.name) });
  };

  const handleLeaveJio = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(userData) await updateDoc(doc(db, "jios", id), { participants: arrayRemove(userData.name) });
  };

  const canViewJio = (jio: JioEvent) => {
    if (jio.creatorId === userData?.uid) return true;
    if (jio.visibility === 'Everyone') return true;
    if (jio.visibility === 'Immediate Family') {
      const rel = getRelationshipLabel(jio.creatorId);
      return ['Parent', 'Child', 'Sibling', 'Partner'].includes(rel);
    }
    if (jio.visibility === 'Peers') {
      const creator = memberMap[jio.creator] || familyMembers?.find((m:any) => m.uid === jio.creatorId);
      return creator && creator.generation === userData.generation;
    }
    if (jio.visibility === 'Youths') {
      const maxGen = Math.max(...(familyMembers?.map((m: any) => m.generation || 0) || [0]));
      return userData.generation >= maxGen - 1;
    }
    return true; 
  };

  const myJios = jioEvents.filter(e => e.creatorId === userData?.uid).sort((a,b) => b.date.getTime() - a.date.getTime());
  const otherUpcomingJios = jioEvents
    .filter(e => e.creatorId !== userData?.uid && e.date >= new Date() && canViewJio(e))
    .sort((a,b) => a.date.getTime() - b.date.getTime());

  const ParticipantFacePile = ({ names, onClick }: { names: string[], onClick: (e: React.MouseEvent) => void }) => {
    const displayNames = names.slice(0, 4);
    const remaining = names.length - 4;
    return (
      <div onClick={onClick} className="flex -space-x-2 overflow-hidden py-1 cursor-pointer hover:scale-105 transition-transform justify-end">
        {displayNames.map((name, i) => {
          const member = memberMap[name];
          const photoURL = member?.photoURL;
          const initials = name.slice(0,2).toUpperCase();
          return (
            <div key={i} className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-white">
              {photoURL ? (
                <img src={photoURL} alt={name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-[9px] font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
          );
        })}
        {remaining > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white bg-[#FAF7F4] text-[9px] font-bold text-[#CB857C]">
            +{remaining}
          </div>
        )}
      </div>
    );
  };

  const JioCard = ({ jio }: { jio: JioEvent }) => {
    const isCreator = jio.creatorId === userData?.uid;
    const hasJoined = jio.participants.includes(userData?.name || '');
    const [localSuggestions, setLocalSuggestions] = useState<DisplayMember[]>([]);
    const [isLocalMatching, setIsLocalMatching] = useState(false);

    const fetchMatchesForJio = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsLocalMatching(true);
      try {
        const membersPayload = familyMembers.map((m: any) => ({ 
          name: m.name, 
          interests: m.interests || [] 
        }));
        const res = await fetch("http://localhost:5001/suggest-jio-matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: jio.title, description: jio.description, members: membersPayload }),
        });
        const data = await res.json();
        const aiSuggestedNames = (data.suggestions || []).map((n: string) => n.trim().toLowerCase());
        const matchedMembers = familyMembers.filter((m: any) => aiSuggestedNames.includes(m.name.trim().toLowerCase()));
        setLocalSuggestions(matchedMembers);
      } catch (e) { console.error(e); } finally { setIsLocalMatching(false); }
    };

    return (
      <div 
        onClick={() => setSelectedEvent(jio)} 
        className="bg-white rounded-[2.5rem] border border-[#CB857C]/10 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative"
      >
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1.5 rounded-xl text-[11px] font-medium tracking-wider uppercase border flex items-center gap-1.5 ${categoryColors[jio.category]}`}>
                {categorySVGs[jio.category]} {jio.category}
              </span>
              <span className="text-xs text-[#CB857C] font-normal">
                by <span className="text-[#9C2D41] font-medium bg-[#F6CBB7]/20 px-2 py-0.5 rounded-md">{jio.creator}</span>
              </span>
            </div>
            <h3 className="text-3xl font-light text-[#9C2D41] mb-3 leading-tight group-hover:text-[#852233] transition-colors" style={{ fontFamily: 'Georgia, serif' }}>
              {jio.title}
            </h3>
            <p className="text-base text-[#CB857C]/80 line-clamp-2 mb-5 font-normal leading-relaxed">
              {jio.description}
            </p>
            <div className="flex items-center gap-5 text-sm text-[#CB857C] font-medium">
               <div className="flex items-center gap-2 bg-[#FAF7F4] px-3 py-1.5 rounded-xl border border-[#CB857C]/10">
                 <Icons.Calendar /> {jio.date.toLocaleDateString()}
               </div>
               <div className="flex items-center gap-2 bg-[#FAF7F4] px-3 py-1.5 rounded-xl border border-[#CB857C]/10">
                 <Icons.Clock /> {formatTimeDisplay(jio.time)}
               </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between min-w-[150px] border-l border-[#FAF7F4] pl-8 md:border-l border-[#CB857C]/10">
             <div className="text-right mb-6 w-full">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowParticipantsModal(jio.id); }}
                  className="text-xs font-bold text-[#9C2D41] block mb-2 hover:underline uppercase tracking-wide ml-auto"
                >
                  {jio.participants.length} Going
                </button>
                <ParticipantFacePile names={jio.participants} onClick={(e) => { e.stopPropagation(); setShowParticipantsModal(jio.id); }} />
             </div>
             {isCreator ? (
               <button onClick={(e) => { e.stopPropagation(); openEditForm(jio); }} className="w-full py-3 px-5 bg-[#FAF7F4] text-[#CB857C] text-sm font-medium rounded-2xl hover:bg-[#F6CBB7]/20 hover:text-[#9C2D41] transition-colors">Edit</button>
             ) : hasJoined ? (
                <button onClick={(e) => handleLeaveJio(e, jio.id)} className="w-full py-3 px-5 bg-[#FFF1F2] text-[#BE123C] text-sm font-medium rounded-2xl border border-[#BE123C]/20 hover:bg-[#FFE4E6] transition-colors">Leave</button>
             ) : (
                <button onClick={(e) => handleJoinJio(e, jio.id)} className="w-full py-3 px-5 bg-[#9C2D41] text-white text-sm font-medium rounded-2xl shadow-md hover:shadow-lg hover:bg-[#852233] active:scale-95 transition-all">Join</button>
             )}
          </div>
        </div>
        {isCreator && (
          <div className="mt-6 pt-6 border-t border-[#FAF7F4]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Icons.Sparkles />
                <h4 className="text-[11px] font-bold text-[#9C2D41] uppercase tracking-widest">Kindred Matches</h4>
              </div>
              <button onClick={fetchMatchesForJio} className="text-[10px] text-[#CB857C] font-bold hover:text-[#9C2D41] transition-colors">
                {isLocalMatching ? 'Finding...' : 'Find Matches'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localSuggestions.length > 0 ? localSuggestions.map(member => (
                <button
                  key={member.uid}
                  onClick={(e) => {
                    e.stopPropagation();
                    const msg = `Hi ${member.name}! I'm organizing "${jio.title}" on ${jio.date.toLocaleDateString()}. Based on your interests, I thought you might want to join!`;
                    sendNotificationChats([member], msg);
                    alert(`Private invite sent to ${member.name}!`);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F4] border border-[#CB857C]/20 rounded-full text-[11px] text-[#9C2D41] hover:bg-[#9C2D41] hover:text-white transition-all shadow-sm"
                >
                  <span>Invite {member.name}</span>
                  <Icons.Plus />
                </button>
              )) : !isLocalMatching && <p className="text-[10px] text-[#CB857C] italic">No matches found yet. Try clicking Find Matches!</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-16 min-h-screen bg-[#FAF7F4]">
      <div className="flex justify-between items-end mb-16">
        <div>
          <h1 className="text-6xl font-light text-[#9C2D41] mb-3 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Open Jio</h1>
          <p className="text-[#CB857C] text-lg font-normal">Connect through shared experiences</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-[#CB857C]/20">
            <button onClick={() => setActiveTab('list')} className={`px-8 py-3 rounded-xl text-base font-medium transition-all ${activeTab === 'list' ? 'bg-[#9C2D41] text-white shadow-md' : 'text-[#9C2D41] hover:bg-[#F6CBB7]/10'}`}>List</button>
            <button onClick={() => setActiveTab('calendar')} className={`px-8 py-3 rounded-xl text-base font-medium transition-all ${activeTab === 'calendar' ? 'bg-[#9C2D41] text-white shadow-md' : 'text-[#9C2D41] hover:bg-[#F6CBB7]/10'}`}>Calendar</button>
          </div>
          <button onClick={handleOpenCreate} className="bg-[#9C2D41] text-white px-8 py-4 rounded-2xl font-medium text-base shadow-md hover:shadow-lg hover:bg-[#852233] active:scale-95 transition-all tracking-wide flex items-center gap-2">
            <Icons.Plus /> Create
          </button>
        </div>
      </div>
      {activeTab === 'calendar' ? (
        <div className="bg-white rounded-[3rem] border border-[#CB857C]/20 overflow-hidden shadow-lg">
          <div className="p-10 flex justify-between items-center bg-white border-b border-[#CB857C]/10">
            <h2 className="text-3xl font-light text-[#9C2D41]" style={{ fontFamily: 'Georgia, serif' }}>
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-3">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-3 text-[#9C2D41] hover:bg-[#FAF7F4] rounded-xl border border-[#CB857C]/20 transition-all"><Icons.ChevronLeft /></button>
              <button onClick={() => setViewDate(new Date())} className="px-6 py-2 text-sm font-bold border border-[#CB857C]/20 rounded-xl text-[#9C2D41] hover:bg-[#FAF7F4] transition-all">Today</button>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-3 text-[#9C2D41] hover:bg-[#FAF7F4] rounded-xl border border-[#CB857C]/20 transition-all"><Icons.ChevronRight /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center py-6 border-b border-[#CB857C]/10 text-xs font-bold uppercase text-[#CB857C] tracking-widest bg-[#FAF7F4]/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 bg-[#FAF7F4]/30">
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => <div key={i} className="h-40 border-b border-r border-[#CB857C]/10 bg-[#FAF7F4]/50" />)}
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1; 
              const dayJios = jioEvents.filter(e => e.date.getDate() === day && e.date.getMonth() === viewDate.getMonth() && e.date.getFullYear() === viewDate.getFullYear());
              const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
              return (
                <div key={day} className={`h-40 border-b border-r border-[#CB857C]/10 p-4 hover:bg-white transition-all group ${isToday ? 'bg-white ring-inset ring-2 ring-[#9C2D41]/10' : ''}`}>
                  <span className={`text-base font-bold inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${isToday ? 'bg-[#9C2D41] text-white shadow-md' : 'text-[#CB857C] group-hover:text-[#9C2D41]'}`}>{day}</span>
                  <div className="space-y-1.5 overflow-y-auto max-h-[90px] pr-1 custom-scrollbar">
                    {dayJios.map(jio => (
                      <button key={jio.id} onClick={() => setSelectedEvent(jio)} className="w-full text-left text-xs py-2 px-2.5 rounded-xl bg-white border border-[#CB857C]/20 text-[#9C2D41] truncate font-bold flex items-center gap-2 hover:border-[#9C2D41]/40 hover:shadow-sm transition-all shadow-sm">
                        <span className="opacity-80 scale-90">{categorySVGs[jio.category]}</span><span className="truncate">{jio.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-16">
          {myJios.length > 0 && (
            <section>
              <h2 className="text-3xl font-light text-[#9C2D41] mb-8 flex items-center gap-4 border-b border-[#CB857C]/10 pb-4" style={{ fontFamily: 'Georgia, serif' }}>
                <span className="p-2.5 bg-[#F6CBB7]/20 rounded-2xl"><Icons.User /></span> My Jios
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{myJios.map(jio => <JioCard key={jio.id} jio={jio} />)}</div>
            </section>
          )}
          <section>
            <h2 className="text-3xl font-light text-[#9C2D41] mb-8 flex items-center gap-4 border-b border-[#CB857C]/10 pb-4" style={{ fontFamily: 'Georgia, serif' }}>
               <span className="p-2.5 bg-[#F6CBB7]/20 rounded-2xl"><Icons.Calendar /></span> Family Activity Feed
            </h2>
            <div className="grid grid-cols-1 gap-8">{otherUpcomingJios.map(jio => <JioCard key={jio.id} jio={jio} />)}</div>
          </section>
        </div>
      )}
      {showCreateForm && (
        <div className="fixed inset-0 bg-[#9C2D41]/10 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-2xl shadow-2xl border border-[#CB857C]/20 relative">
            <button onClick={handleCloseForm} className="absolute top-8 right-8 text-[#CB857C] hover:text-[#9C2D41] p-2 hover:bg-[#FAF7F4] rounded-full transition-all"><Icons.X /></button>
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-light text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>{isEditing ? 'Edit Jio' : 'Create New Jio'}</h2>
              <p className="text-[#CB857C] text-lg font-light">Plan your next family gathering</p>
            </div>
            <div className="space-y-8 mb-10">
              <div><label className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest block mb-2 ml-1">Activity Title</label><input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl outline-none focus:ring-2 focus:ring-[#9C2D41]/20 border border-transparent focus:border-[#CB857C]/40 text-[#9C2D41] text-lg font-normal transition-all" placeholder="e.g., Sunday Brunch" /></div>
              <div><label className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest block mb-2 ml-1">Description</label><textarea value={formState.description} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl outline-none border border-transparent focus:border-[#CB857C]/40 resize-none text-[#9C2D41] transition-all focus:ring-2 focus:ring-[#9C2D41]/20 text-base font-normal" rows={3} placeholder="Add details..." /></div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest block mb-2 ml-1">Date</label><input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl border border-transparent focus:border-[#CB857C]/40 text-[#9C2D41] outline-none focus:ring-2 focus:ring-[#9C2D41]/20 font-normal" /></div>
                <div><label className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest block mb-2 ml-1">Time</label><input type="time" value={formState.time} onChange={e => setFormState({...formState, time: e.target.value})} className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl border border-transparent focus:border-[#CB857C]/40 text-[#9C2D41] outline-none focus:ring-2 focus:ring-[#9C2D41]/20 font-normal" /></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest block mb-2 ml-1">Category</label>
                  <div className="relative"><select value={formState.category} onChange={e => setFormState({...formState, category: e.target.value as any})} className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl outline-none border border-transparent focus:border-[#CB857C]/40 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/20 transition-all appearance-none font-normal cursor-pointer"><option value="meal">Meal</option><option value="activity">Activity</option><option value="errand">Errand</option><option value="other">Other</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-[#9C2D41]"><Icons.ChevronRight /></div></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest block mb-2 ml-1">Visibility</label>
                  <div className="relative">
                    <select value={formState.visibility} onChange={e => setFormState({...formState, visibility: e.target.value})} className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl outline-none border border-transparent focus:border-[#CB857C]/40 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/20 transition-all appearance-none font-normal cursor-pointer">{Object.keys(visibilityGroups).map(name => <option key={name} value={name}>{name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-[#9C2D41]"><Icons.ChevronRight /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-6 pt-6 border-t border-[#CB857C]/10">
              <button onClick={handleCloseForm} className="flex-1 py-4 bg-white text-[#9C2D41] rounded-2xl font-bold border-2 border-[#CB857C]/20 hover:bg-[#FAF7F4] hover:border-[#9C2D41]/20 transition-all uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={handleCreateOrUpdateJio} disabled={isSubmitting} className="flex-1 bg-[#9C2D41] text-white py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-[#852233] disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-xs">{isEditing ? 'Update' : 'Launch'}</button>
            </div>
          </div>
        </div>
      )}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-[#9C2D41]/10 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowParticipantsModal(null)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-[#CB857C]/20 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowParticipantsModal(null)} className="absolute top-6 right-6 text-[#CB857C] hover:text-[#9C2D41]"><Icons.X /></button>
            <h3 className="text-2xl font-light text-[#9C2D41] mb-6 text-center border-b border-[#CB857C]/10 pb-4" style={{ fontFamily: 'Georgia, serif' }}>Guest List</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {jioEvents.find(j => j.id === showParticipantsModal)?.participants.map((name, i) => {
                const member = memberMap[name];
                const isMe = member?.uid === userData?.uid;
                const relationship = (member && !isMe) ? getRelationshipLabel(member.uid) : "";
                return (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-[#FAF7F4] rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {member?.photoURL ? <img src={member.photoURL} className="h-full w-full object-cover" /> : name.slice(0,2).toUpperCase()}
                      </div>
                      <span className="text-[#9C2D41] font-medium text-base">{name}</span>
                    </div>
                    {isMe ? <span className="text-[10px] uppercase font-bold text-[#CB857C] bg-[#F6CBB7]/20 px-2 py-1 rounded-lg">You</span> : relationship && <span className="text-[10px] uppercase font-bold text-[#CB857C] bg-[#F6CBB7]/20 px-2 py-1 rounded-lg">{relationship}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}