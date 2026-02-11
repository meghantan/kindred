'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, query, where, onSnapshot, orderBy, addDoc, 
  serverTimestamp, updateDoc, doc, getDocs, limit 
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

// --- Reusable Avatar Component ---
const UserAvatar = ({ name, url, size = "w-10 h-10", textClass = "text-sm" }: { name: string, url?: string | null, size?: string, textClass?: string }) => {
  const [imageError, setImageError] = useState(false);
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  useEffect(() => {
    setImageError(false);
  }, [url]);

  return (
    <div className={`${size} rounded-full flex items-center justify-center border-2 border-white shadow-sm relative overflow-hidden shrink-0 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] transition-all duration-300`}>
      {!imageError && url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <span className={`font-semibold text-[#FAF7F4] tracking-wider ${textClass}`}>{initials}</span>
      )}
    </div>
  );
};

export default function ChatPage({ preselectedMember }: ChatPageProps) {
  const { user, userData, familyMembers, getRelationshipLabel } = useAuth();
  
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  
  // FIX: Track the latest message for each user in real-time
  const [latestMessages, setLatestMessages] = useState<Record<string, {text: string, time: any}>>({});
  
  const [isTranslationMode, setIsTranslationMode] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isTranslating, setIsTranslating] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // FIX: Real-time listener for the latest message in each chat
  useEffect(() => {
    if (!user || !familyMembers || familyMembers.length === 0) return;

    const otherMembers = familyMembers.filter((m: any) => m.uid !== user.uid);
    
    const unsubscribes = otherMembers.map(member => {
      const chatId = [user.uid, member.uid].sort().join('_');
      // Limit to 1 because we only care about the very last message for the preview
      const q = query(
        collection(db, "chats", chatId, "messages"), 
        orderBy("createdAt", "desc"), 
        limit(1) 
      );

      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const lastMsg = snapshot.docs[0].data();
          setLatestMessages(prev => ({
            ...prev,
            [member.uid]: {
              text: lastMsg.text,
              time: lastMsg.createdAt
            }
          }));
        }
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, familyMembers]);

  // FIX: Dynamically derive the chat previews array based on the real-time latestMessages state
  const chatPreviews: ChatPreview[] = familyMembers
    .filter((m: any) => m.uid !== user?.uid)
    .map(member => {
      const lastMsg = latestMessages[member.uid];
      const unreadCount = unreadNotifications.filter(n => n.senderId === member.uid).length;

      return {
        member: member as UserProfile,
        lastMessage: lastMsg ? lastMsg.text : "No messages yet",
        lastMessageTime: lastMsg ? lastMsg.time : null,
        unreadCount
      };
    })
    .sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      
      // serverTimestamp can be null for a split second before the server confirms it, fallback to Date.now()
      const timeA = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : Date.now();
      const timeB = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : Date.now();
      
      return timeB - timeA;
    });

  // Clear notifications
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

  // Fetch messages
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


  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        setIsTranslating(true); 
        
        try {
          const res = await fetch("http://localhost:5001/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              audio: base64Audio,
              shouldTranslate: false 
            }),
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            alert(`Transcription Failed: ${data.error || 'Unknown error occurred'}`);
            setIsTranslating(false);
            return;
          }

          if (data.text) {
            setNewMessage(data.text);
          }
        } catch (err) {
          alert("Network Error: Could not connect to the transcription server.");
          console.error("Transcription failed", err);
        } finally {
          setIsTranslating(false);
        }
      };
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
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

  return (
    <div className="flex h-[calc(100vh-96px)] max-w-7xl mx-auto bg-[#FAF7F4] pt-4">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[420px] border-r border-[#CB857C]/10 bg-white hidden md:flex flex-col shadow-sm rounded-tl-[1.5rem]">
        <div className="px-10 pt-10 pb-8 border-b border-[#CB857C]/10">
          <h2 className="text-4xl font-light text-[#9C2D41] mb-2 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
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
                <UserAvatar 
                  name={preview.member.name} 
                  url={preview.member.photoURL} 
                  size="w-14 h-14" 
                  textClass="text-lg" 
                />
                {preview.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-[#9C2D41] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10">
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
                  {getRelationshipLabel(preview.member.uid)}
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
      <div className="flex-1 flex flex-col relative bg-[#FAF7F4] rounded-tr-[1.5rem] overflow-hidden">
        {selectedMember ? (
          <>
            {/* HEADER */}
            <div className="px-10 pt-8 pb-6 border-b border-[#CB857C]/10 flex items-center justify-between bg-white shadow-sm sticky top-0 z-10">
              <div className="flex items-center gap-5">
                <UserAvatar 
                  key={selectedMember.uid}
                  name={selectedMember.name} 
                  url={selectedMember.photoURL} 
                  size="w-14 h-14" 
                  textClass="text-lg" 
                />
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
                  
                  {/* Dropdown Container */}
                  <div className="flex items-center gap-5 flex-1">
                    
                    {/* FROM LANG DROPDOWN */}
                    <div className="relative flex-1">
                      <select 
                        value={fromLang} 
                        onChange={(e) => setFromLang(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white rounded-2xl outline-none border-2 border-[#CB857C]/20 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/30 transition-all appearance-none shadow-sm font-normal cursor-pointer"
                      >
                        {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9C2D41]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <svg className="w-5 h-5 text-[#CB857C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    
                    {/* TO LANG DROPDOWN */}
                    <div className="relative flex-1">
                      <select 
                        value={toLang} 
                        onChange={(e) => setToLang(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white rounded-2xl outline-none border-2 border-[#CB857C]/20 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/30 transition-all appearance-none shadow-sm font-normal cursor-pointer"
                      >
                        {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
            )}

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#FAF7F4]">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                const sender = isMe ? userData : selectedMember;
                
                return (
                  <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="flex-shrink-0">
                      <UserAvatar 
                        name={sender?.name || 'User'} 
                        url={sender?.photoURL} 
                        size="w-11 h-11" 
                        textClass="text-sm" 
                      />
                    </div>

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
            <div className="p-6 border-t border-[#CB857C]/10 bg-white shadow-sm">
               <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                 
                 {/* VOICE RECORD BUTTON */}
                 <button 
                   type="button"
                   onClick={isRecording ? stopRecording : startRecording}
                   disabled={isTranslating}
                   className={`p-4 rounded-full transition-all shrink-0 shadow-sm flex items-center justify-center ${
                     isRecording 
                       ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                       : 'bg-[#FAF7F4] text-[#9C2D41] border border-[#CB857C]/30 hover:bg-[#F6CBB7]/30'
                   } ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
                   title={isRecording ? "Stop Recording" : "Start Voice Typing"}
                 >
                   {isRecording ? (
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M6 6h4v12H6zM14 6h4v12h-4z" />
                     </svg>
                   ) : (
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v1a7 7 0 01-14 0v-1M12 19v4m-4 0h8" />
                     </svg>
                   )}
                 </button>

                 {/* TEXT INPUT */}
                 <div className="relative flex-1">
                   <input
                     type="text"
                     value={newMessage}
                     onChange={(e) => setNewMessage(e.target.value)}
                     disabled={isTranslating || isRecording}
                     placeholder={
                       isRecording ? "Listening... (Tap pause to stop)" : 
                       isTranslating ? "Transcribing..." : 
                       isTranslationMode ? `Type or speak in ${LANGUAGES.find(l=>l.id===fromLang)?.name}...` : 
                       "Type a message..."
                     }
                     className={`w-full pl-6 pr-12 py-4 rounded-[2rem] border bg-[#FAF7F4] focus:outline-none focus:ring-2 transition-all text-[#9C2D41] text-[15px] font-normal shadow-sm ${
                        isTranslationMode 
                          ? 'border-[#9C2D41]/30 focus:border-[#9C2D41] focus:ring-[#9C2D41]/20 placeholder-[#9C2D41]/50' 
                          : 'border-[#CB857C]/30 focus:ring-[#CB857C]/20 focus:border-[#CB857C] placeholder-[#CB857C]/60'
                     } ${(isTranslating || isRecording) ? 'opacity-80 bg-gray-50' : ''}`}
                   />
                   
                   {/* Transcribing Loading Spinner */}
                   {isTranslating && (
                     <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#CB857C]">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                     </div>
                   )}
                 </div>

                 {/* SEND BUTTON */}
                 <button 
                   type="submit"
                   disabled={isTranslating || isRecording || !newMessage.trim()}
                   className="px-10 py-4 rounded-[2rem] font-semibold text-white transition-all active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg bg-[#9C2D41] hover:bg-[#852233] tracking-wide text-sm shrink-0"
                 >
                   Send
                 </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-white">
            <div className="w-40 h-40 bg-[#F6CBB7]/15 rounded-full flex items-center justify-center mb-10 shadow-sm">
              <svg className="w-20 h-20 text-[#9C2D41]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-6xl font-light text-[#9C2D41] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
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