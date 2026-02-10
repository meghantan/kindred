'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

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

const LANGUAGES = [
  { id: 'gen-z', name: 'Gen Z Slang', flag: '🔥' },
  { id: 'elder-english', name: 'Elder English', flag: '📚' },
  { id: 'mandarin', name: 'Mandarin', flag: '🇨🇳' },
  { id: 'hokkien', name: 'Hokkien', flag: '🏮' },
  { id: 'cantonese', name: 'Cantonese', flag: '🥟' },
  { id: 'english', name: 'Standard English', flag: '🇬🇧' },
];

export default function ChatPage({ preselectedMember }: ChatPageProps) {
  const { user, userData } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isTranslationMode, setIsTranslationMode] = useState(false);
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      if (fromLang === "gen-z" && toLang === "elder-english") {
        translated = text
          .replace(/fire/gi, "excellent")
          .replace(/no cap/gi, "honestly")
          .replace(/hits different/gi, "is exceptionally good")
          .replace(/slaps/gi, "is wonderful")
          .replace(/bet/gi, "certainly")
          .replace(/fr/gi, "for real")
          .replace(/bussin/gi, "delicious")
          .replace(/periodt/gi, "end of discussion");
      } else if (fromLang === "elder-english" && toLang === "gen-z") {
        translated = text
          .replace(/excellent/gi, "fire")
          .replace(/honestly/gi, "no cap")
          .replace(/exceptionally good/gi, "hits different")
          .replace(/wonderful/gi, "slaps")
          .replace(/certainly/gi, "bet");
      } else {
        const fromName = LANGUAGES.find(l => l.id === fromLang)?.name;
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
  };

  return (
    <div className="flex h-[calc(100vh-64px)] max-w-6xl mx-auto border-x border-[#CB857C]/20 bg-[#FAF7F4] shadow-sm">
      
      {/* LEFT SIDEBAR */}
      <div className="w-1/3 border-r border-[#CB857C]/20 bg-white/50 backdrop-blur-sm hidden md:flex flex-col">
        <div className="p-4 border-b border-[#CB857C]/10">
          <h2 className="font-medium text-lg text-[#9C2D41]">Family Members</h2>
          <p className="text-xs text-[#CB857C] font-light">Select a member to chat</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {familyMembers.map((member) => (
            <button
              key={member.uid}
              onClick={() => setSelectedMember(member)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                selectedMember?.uid === member.uid 
                  ? 'bg-[#F6CBB7]/30 shadow-sm ring-1 ring-[#9C2D41]/20' 
                  : 'hover:bg-[#F6CBB7]/10'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-[#FAF7F4] flex items-center justify-center font-medium text-lg">
                {member.name[0]}
              </div>
              <div>
                <p className="font-medium text-sm text-[#9C2D41]">{member.name}</p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-[#CB857C]/10 text-[#9C2D41] uppercase font-medium tracking-wider">
                  {member.role}
                </span>
              </div>
            </button>
          ))}
          {familyMembers.length === 0 && (
            <div className="p-8 text-center text-[#CB857C] text-sm font-light">No one else is here yet.</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: CHAT */}
      <div className="flex-1 flex flex-col relative bg-[#FAF7F4]">
        {selectedMember ? (
          <>
            {/* HEADER */}
            <div className="h-16 px-6 border-b border-[#CB857C]/10 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-[#FAF7F4] flex items-center justify-center font-medium text-sm md:hidden">
                    {selectedMember.name[0]}
                 </div>
                 <div>
                   <h3 className="font-medium text-[#9C2D41] leading-tight">{selectedMember.name}</h3>
                   <p className="text-xs text-[#CB857C] font-light">● Online</p>
                 </div>
              </div>

              <button
                onClick={() => setIsTranslationMode(!isTranslationMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  isTranslationMode
                    ? 'bg-[#9C2D41] text-[#FAF7F4] border-[#9C2D41] shadow-md'
                    : 'bg-white text-[#CB857C] border-[#CB857C]/30 hover:bg-[#F6CBB7]/20'
                }`}
              >
                <span>{isTranslationMode ? '✨' : '🌐'}</span>
                {isTranslationMode ? 'AI Translator Active' : 'Enable Translation'}
              </button>
            </div>

            {/* TRANSLATION SETTINGS BAR */}
            {isTranslationMode && (
              <div className="bg-[#F6CBB7]/30 border-b border-[#CB857C]/20 px-6 py-2 flex items-center gap-2">
                <span className="text-xs font-medium text-[#9C2D41] uppercase tracking-wide">Translate:</span>
                
                <select 
                  value={fromLang} 
                  onChange={(e) => setFromLang(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border-[#CB857C]/30 bg-white text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41] outline-none"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
                </select>

                <span className="text-[#CB857C]">→</span>

                <select 
                  value={toLang} 
                  onChange={(e) => setToLang(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border-[#CB857C]/30 bg-white text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41] outline-none"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
                </select>
              </div>
            )}

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF7F4]">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm shadow-sm relative group ${
                      isMe 
                        ? 'bg-[#9C2D41] text-[#FAF7F4] rounded-tr-none' 
                        : 'bg-white text-[#9C2D41] border border-[#CB857C]/20 rounded-tl-none'
                    }`}>
                      
                      {msg.translatedText ? (
                        <>
                          <p className="font-normal text-[15px]">{msg.translatedText}</p>
                          <hr className={`my-2 ${isMe ? 'border-[#FAF7F4]/30' : 'border-[#CB857C]/20'}`} />
                          <p className={`text-xs font-light ${isMe ? 'text-[#FAF7F4]/80' : 'text-[#CB857C]'}`}>
                            Original: "{msg.text}"
                          </p>
                        </>
                      ) : (
                        <p className="font-light">{msg.text}</p>
                      )}

                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 border-t border-[#CB857C]/10 bg-white/80 backdrop-blur-sm">
               <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   disabled={isTranslating}
                   placeholder={isTranslationMode ? `Type in ${LANGUAGES.find(l=>l.id===fromLang)?.name}...` : "Type a message..."}
                   className={`flex-1 pl-4 pr-12 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all text-[#9C2D41] placeholder-[#CB857C]/50 ${
                      isTranslationMode 
                        ? 'border-[#9C2D41]/30 focus:border-[#9C2D41] focus:ring-[#9C2D41]/20' 
                        : 'border-[#CB857C]/30 focus:ring-[#CB857C]/20 focus:border-[#CB857C]'
                   }`}
                 />
                 <button 
                   type="submit"
                   disabled={isTranslating}
                   className={`px-5 rounded-xl font-medium text-[#FAF7F4] transition-all active:scale-95 disabled:opacity-50 ${
                      isTranslationMode ? 'bg-[#9C2D41] hover:bg-[#CB857C]' : 'bg-[#9C2D41] hover:bg-[#CB857C]'
                   }`}
                 >
                   {isTranslating ? 'Wait...' : 'Send'}
                 </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#CB857C] p-8 text-center">
            <div className="w-16 h-16 bg-[#F6CBB7]/30 rounded-full flex items-center justify-center text-3xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-[#9C2D41]">Your Family Chat</h3>
            <p className="text-sm max-w-xs mt-2 font-light">Select a family member to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}