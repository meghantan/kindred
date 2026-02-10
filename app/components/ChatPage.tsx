'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, query, where, onSnapshot, orderBy, addDoc, 
  serverTimestamp, updateDoc, doc, getDocs 
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  translatedText?: string;
  senderId: string;
  createdAt: any;
  fromLang?: string;
  toLang?: string;
}

interface UserProfile {
  uid: string;
  name: string;
  role: string;
  photoURL?: string;
}

interface ChatPageProps {
  preselectedMember?: UserProfile | null;
}

interface ChatPreview {
  member: UserProfile;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
}

const LANGUAGES = [
  { id: 'gen-z', name: 'Gen Z Slang', flag: '' },
  { id: 'elder-english', name: 'Elder English', flag: '' },
  { id: 'mandarin', name: 'Mandarin', flag: '' },
  { id: 'hokkien', name: 'Hokkien', flag: '' },
  { id: 'cantonese', name: 'Cantonese', flag: '' },
  { id: 'english', name: 'Standard English', flag: '' },
];

export default function ChatPage({ preselectedMember }: ChatPageProps) {
  const { user, userData } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  
  const [isTranslationMode, setIsTranslationMode] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch family members
  useEffect(() => {
    if (!userData?.familyId) return;
    const q = query(collection(db, "users"), where("familyId", "==", userData.familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.uid !== user?.uid) members.push({ uid: data.uid, ...data } as UserProfile);
      });
      setFamilyMembers(members);
    });
    return () => unsubscribe();
  }, [userData, user]);

  // Fetch unread notifications
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"), 
      where("recipientId", "==", user.uid),
      where("isRead", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnreadNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  // Build chat previews with last message
  useEffect(() => {
    if (!user || familyMembers.length === 0) return;

    const fetchChatPreviews = async () => {
      const previews: ChatPreview[] = [];

      for (const member of familyMembers) {
        const chatId = [user.uid, member.uid].sort().join('_');
        const q = query(
          collection(db, "chats", chatId, "messages"), 
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const lastMsg = snapshot.docs[0];
        
        const unreadCount = unreadNotifications.filter(n => n.senderId === member.uid).length;

        previews.push({
          member,
          lastMessage: lastMsg ? lastMsg.data().text : "No messages yet",
          lastMessageTime: lastMsg ? lastMsg.data().createdAt : null,
          unreadCount
        });
      }

      // Sort by most recent message
      previews.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
      });

      setChatPreviews(previews);
    };

    fetchChatPreviews();
  }, [familyMembers, user, unreadNotifications]);

  // Clear notifications when selecting a chat
  useEffect(() => {
    if (!selectedMember || !user || unreadNotifications.length === 0) return;

    const clearCurrentChatNotifications = async () => {
      const relevantNotifs = unreadNotifications.filter(n => n.senderId === selectedMember.uid);
      const promises = relevantNotifs.map(n => 
        updateDoc(doc(db, "notifications", n.id), { isRead: true })
      );
      await Promise.all(promises);
    };

    clearCurrentChatNotifications();
  }, [selectedMember, unreadNotifications, user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedMember || !user) return;
    const chatId = [user.uid, selectedMember.uid].sort().join('_');
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [selectedMember, user]);

  useEffect(() => {
    if (preselectedMember) {
      setSelectedMember(preselectedMember);
    }
  }, [preselectedMember]);

  const performTranslation = async (text: string) => {
    try {
      const res = await fetch("http://localhost:5001/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fromLang, toLang }),
      });
      if (!res.ok) throw new Error("API Failed");
      const data = await res.json();
      return data.translated;
    } catch (err) {
      console.log("Using offline fallback translation...");
      let translated = text;

      if (fromLang === "hokkien") {
        const commonHokkien: { [key: string]: string } = {
          "jiak ba buay": "have you eaten yet",
          "ho bo": "how are you",
          "swee": "beautiful/excellent",
          "sian": "boring/tired",
        };
        
        const lowerText = text.toLowerCase().trim();
        if (commonHokkien[lowerText]) {
          return toLang === "gen-z" 
            ? `[Gen Z]: ${commonHokkien[lowerText]} fr` 
            : `[Elder English]: ${commonHokkien[lowerText]}?`;
        }
      }

      if (fromLang === "gen-z" && toLang === "elder-english") {
        translated = text
          .replace(/fire/gi, "excellent")
          .replace(/no cap/gi, "honestly")
          .replace(/slaps/gi, "is wonderful");
      } else if (fromLang === "elder-english" && toLang === "gen-z") {
        translated = text
          .replace(/excellent/gi, "fire")
          .replace(/honestly/gi, "no cap")
          .replace(/wonderful/gi, "slaps");
      } else {
        const toName = LANGUAGES.find(l => l.id === toLang)?.name;
        translated = `[${toName} Translation]: ${text}`;
      }
      return translated;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMember || !user) return;

    const chatId = [user.uid, selectedMember.uid].sort().join('_');
    const originalText = newMessage;
    setNewMessage('');

    let finalTranslatedText = null;
    if (isTranslationMode) {
      setIsTranslating(true);
      finalTranslatedText = await performTranslation(originalText);
      setIsTranslating(false);
    }

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: originalText,
      translatedText: finalTranslatedText,
      senderId: user.uid,
      createdAt: serverTimestamp(),
      fromLang: isTranslationMode ? fromLang : null,
      toLang: isTranslationMode ? toLang : null
    });

    await addDoc(collection(db, "notifications"), {
      recipientId: selectedMember.uid,
      senderId: user.uid,
      text: originalText,
      type: 'chat',
      isRead: false,
      createdAt: serverTimestamp()
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-7xl mx-auto bg-[#FAF7F4]">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[420px] border-r border-[#CB857C]/10 bg-white hidden md:flex flex-col shadow-sm">
        <div className="px-10 py-12 border-b border-[#CB857C]/10">
          <h2 className="text-4xl font-light text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Family Members
          </h2>
          <p className="text-base text-[#CB857C]/80 font-normal">
            Select a member to chat
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {chatPreviews.map((preview) => (
            <button
              key={preview.member.uid}
              onClick={() => setSelectedMember(preview.member)}
              className={`w-full flex items-start gap-4 p-5 rounded-[2rem] transition-all text-left border ${
                selectedMember?.uid === preview.member.uid 
                  ? 'bg-[#F6CBB7]/30 shadow-md border-[#9C2D41]/20' 
                  : 'hover:bg-[#FAF7F4] border-transparent hover:border-[#CB857C]/10'
              }`}
            >
              <div className="relative flex-shrink-0">
                {preview.member.photoURL ? (
                  <img 
                    src={preview.member.photoURL} 
                    alt={preview.member.name}
                    className="w-14 h-14 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {getInitials(preview.member.name)}
                  </div>
                )}
                {preview.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-[#9C2D41] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                    {preview.unreadCount}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-normal text-lg text-[#9C2D41] truncate" style={{ fontFamily: 'Georgia, serif' }}>{preview.member.name}</p>
                  <span className="text-xs text-[#CB857C]/80 font-normal ml-2 flex-shrink-0">
                    {formatTime(preview.lastMessageTime)}
                  </span>
                </div>
                <p className={`text-sm truncate mb-2 ${preview.unreadCount > 0 ? 'text-[#9C2D41] font-semibold' : 'text-[#CB857C]/70 font-normal'}`}>
                  {preview.lastMessage}
                </p>
                <span className="inline-block px-3 py-1 rounded-full text-[10px] bg-[#CB857C]/10 text-[#CB857C] uppercase font-bold tracking-wider">
                  {preview.member.role}
                </span>
              </div>
            </button>
          ))}
          {chatPreviews.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-[#CB857C]/80 font-normal text-lg">
                No family members yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: CHAT */}
      <div className="flex-1 flex flex-col relative bg-[#FAF7F4]">
        {selectedMember ? (
          <>
            {/* HEADER */}
            <div className="px-10 py-6 border-b border-[#CB857C]/10 flex items-center justify-between bg-white shadow-sm sticky top-0 z-10">
              <div className="flex items-center gap-5">
                {selectedMember.photoURL ? (
                  <img 
                    src={selectedMember.photoURL} 
                    alt={selectedMember.name}
                    className="w-14 h-14 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {getInitials(selectedMember.name)}
                  </div>
                )}
                <div>
                  <h3 className="font-normal text-xl text-[#9C2D41] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                    {selectedMember.name}
                  </h3>
                  <p className="text-sm text-[#CB857C] font-normal">Online</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsTranslationMode(!isTranslationMode);
                    if (!isTranslationMode) setShowTranslationSettings(true);
                    else setShowTranslationSettings(false);
                  }}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-sm font-medium transition-all border shadow-sm ${
                    isTranslationMode
                      ? 'bg-[#9C2D41] text-white border-[#9C2D41]'
                      : 'bg-white text-[#9C2D41] border-[#CB857C]/30 hover:bg-[#FAF7F4]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span>
                    {isTranslationMode ? 'Translation Active' : 'Translate'}
                  </span>
                </button>

                {isTranslationMode && (
                  <button
                    onClick={() => setShowTranslationSettings(!showTranslationSettings)}
                    className="p-2.5 rounded-full bg-[#FAF7F4] text-[#9C2D41] hover:bg-[#F6CBB7]/30 transition-all border border-[#CB857C]/20"
                    title="Translation Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* TRANSLATION SETTINGS */}
            {isTranslationMode && showTranslationSettings && (
              <div className="bg-gradient-to-r from-[#F6CBB7]/15 to-[#FAF7F4] border-b border-[#CB857C]/10 px-10 py-6">
                <div className="flex items-center gap-6 max-w-4xl">
                  <span className="text-sm font-semibold text-[#9C2D41] uppercase tracking-wider whitespace-nowrap">
                    Translate
                  </span>
                  <div className="flex items-center gap-5 flex-1">
                    <select 
                      value={fromLang} 
                      onChange={(e) => setFromLang(e.target.value)}
                      className="flex-1 text-sm px-4 py-3 rounded-2xl border-[#CB857C]/30 bg-white text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/20 outline-none shadow-sm font-medium"
                    >
                      {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <svg className="w-5 h-5 text-[#CB857C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <select 
                      value={toLang} 
                      onChange={(e) => setToLang(e.target.value)}
                      className="flex-1 text-sm px-4 py-3 rounded-2xl border-[#CB857C]/30 bg-white text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/20 outline-none shadow-sm font-medium"
                    >
                      {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#FAF7F4]">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                const sender = isMe ? userData : selectedMember;
                
                return (
                  <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {sender?.photoURL ? (
                        <img 
                          src={sender.photoURL} 
                          alt={sender.name}
                          className="w-11 h-11 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {getInitials(sender?.name || 'U')}
                        </div>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div className={`max-w-[65%] px-6 py-5 rounded-[2rem] shadow-md ${
                      isMe 
                        ? 'bg-[#9C2D41] text-white rounded-tr-sm text-[15px]' 
                        : 'bg-white text-[#9C2D41] border border-[#CB857C]/10 rounded-tl-sm text-[15px]'
                    }`}>
                      {msg.translatedText ? (
                        <>
                          <p className="font-normal leading-relaxed mb-4">
                            {msg.translatedText}
                          </p>
                          <hr className={`my-4 ${isMe ? 'border-white/20' : 'border-[#CB857C]/20'}`} />
                          <p className={`text-sm ${isMe ? 'text-white/70' : 'text-[#CB857C]/80'}`}>
                            Original: "{msg.text}"
                          </p>
                        </>
                      ) : (
                        <p className="font-normal leading-relaxed">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-8 border-t border-[#CB857C]/10 bg-white shadow-sm">
               <form onSubmit={handleSendMessage} className="flex gap-4">
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   disabled={isTranslating}
                   placeholder={isTranslationMode ? `Type in ${LANGUAGES.find(l=>l.id===fromLang)?.name}...` : "Type a message..."}
                   className={`flex-1 px-6 py-5 rounded-[2rem] border bg-[#FAF7F4] focus:outline-none focus:ring-2 transition-all text-[#9C2D41] placeholder-[#CB857C]/50 text-[15px] font-normal shadow-sm ${
                      isTranslationMode 
                        ? 'border-[#9C2D41]/30 focus:border-[#9C2D41] focus:ring-[#9C2D41]/20' 
                        : 'border-[#CB857C]/30 focus:ring-[#CB857C]/20 focus:border-[#CB857C]'
                   }`}
                 />
                 <button 
                   type="submit"
                   disabled={isTranslating}
                   className="px-10 py-5 rounded-[2rem] font-semibold text-white transition-all active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg bg-[#9C2D41] hover:bg-[#852233] tracking-wide text-sm"
                 >
                   {isTranslating ? 'Translating...' : 'Send'}
                 </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
            <div className="w-40 h-40 bg-[#F6CBB7]/15 rounded-full flex items-center justify-center mb-10 shadow-sm">
              <svg className="w-20 h-20 text-[#9C2D41]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-5xl font-light text-[#9C2D41] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Your Family Chat
            </h3>
            <p className="text-lg text-[#CB857C]/80 font-normal max-w-lg leading-relaxed">
              Select a family member from the sidebar to start your conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}