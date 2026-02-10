'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;           // The original text
  translatedText?: string; // The translated result
  senderId: string;
  createdAt: any;
  fromLang?: string;      // Metadata
  toLang?: string;        // Metadata
}

interface UserProfile {
  uid: string;
  name: string;
  role: string;
  photoURL?: string;
}

// 1. YOUR LANGUAGES CONFIG
const LANGUAGES = [
  { id: 'gen-z', name: 'Gen Z Slang', flag: '🔥' },
  { id: 'elder-english', name: 'Elder English', flag: '📚' },
  { id: 'mandarin', name: 'Mandarin', flag: '🇨🇳' },
  { id: 'hokkien', name: 'Hokkien', flag: '🏮' },
  { id: 'cantonese', name: 'Cantonese', flag: '🥟' },
  { id: 'english', name: 'Standard English', flag: '🇬🇧' },
];

export default function ChatPage() {
  const { user, userData } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // 2. NEW TRANSLATION STATE
  const [isTranslationMode, setIsTranslationMode] = useState(false);
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FETCH FAMILY (Lobby)
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

  // FETCH MESSAGES (Chat Room)
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

  // 3. THE TRANSLATION LOGIC (Integrated from your snippet)
  const performTranslation = async (text: string) => {
    try {
      // A. Try Real API (If you have a server running)
      const res = await fetch("http://localhost:5001/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fromLang, toLang }),
      });
      if (!res.ok) throw new Error("API Failed");
      const data = await res.json();
      return data.translated;
    } catch (err) {
      // B. Fallback: Your Mock Logic (The Hackathon "Magic")
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
        // Generic Fallback
        const fromName = LANGUAGES.find(l => l.id === fromLang)?.name;
        const toName = LANGUAGES.find(l => l.id === toLang)?.name;
        translated = `[${toName} Translation]: ${text}`;
      }
      return translated;
    }
  };

  // 4. SEND MESSAGE (Updated)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMember || !user) return;

    const chatId = [user.uid, selectedMember.uid].sort().join('_');
    const originalText = newMessage;
    setNewMessage(''); // Clear UI immediately

    let finalTranslatedText = null;

    // If Mode is ON, Translate FIRST
    if (isTranslationMode) {
      setIsTranslating(true);
      finalTranslatedText = await performTranslation(originalText);
      setIsTranslating(false);
    }

    // Save to Firestore
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: originalText,
      translatedText: finalTranslatedText, // Save the result!
      senderId: user.uid,
      createdAt: serverTimestamp(),
      fromLang: isTranslationMode ? fromLang : null,
      toLang: isTranslationMode ? toLang : null
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] max-w-6xl mx-auto border-x border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
      
      {/* LEFT SIDEBAR */}
      <div className="w-1/3 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 hidden md:flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Family Members</h2>
          <p className="text-xs text-zinc-500">Select a member to chat</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {familyMembers.map((member) => (
            <button
              key={member.uid}
              onClick={() => setSelectedMember(member)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                selectedMember?.uid === member.uid 
                  ? 'bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:ring-zinc-600' 
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-lg">
                {member.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{member.name}</p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300 uppercase font-bold tracking-wider">
                  {member.role}
                </span>
              </div>
            </button>
          ))}
          {familyMembers.length === 0 && (
            <div className="p-8 text-center text-zinc-400 text-sm">No one else is here yet.</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: CHAT */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-zinc-900">
        {selectedMember ? (
          <>
            {/* HEADER */}
            <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm md:hidden">
                    {selectedMember.name[0]}
                 </div>
                 <div>
                   <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{selectedMember.name}</h3>
                   <p className="text-xs text-green-500 font-medium">● Online</p>
                 </div>
              </div>

              <button
                onClick={() => setIsTranslationMode(!isTranslationMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isTranslationMode
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span>{isTranslationMode ? '✨' : '🌐'}</span>
                {isTranslationMode ? 'AI Translator Active' : 'Enable Translation'}
              </button>
            </div>

            {/* TRANSLATION SETTINGS BAR (Visible when Active) */}
            {isTranslationMode && (
              <div className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30 px-6 py-2 flex items-center gap-2 animate-in slide-in-from-top-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Translate:</span>
                
                <select 
                  value={fromLang} 
                  onChange={(e) => setFromLang(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
                </select>

                <span className="text-purple-400">→</span>

                <select 
                  value={toLang} 
                  onChange={(e) => setToLang(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
                </select>
              </div>
            )}

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm shadow-sm relative group ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-tl-none'
                    }`}>
                      
                      {/* 1. Show Translated Text FIRST (If it exists) */}
                      {msg.translatedText ? (
                        <>
                          <p className="font-medium text-[15px]">{msg.translatedText}</p>
                          <hr className={`my-2 ${isMe ? 'border-white/30' : 'border-zinc-200 dark:border-zinc-700'}`} />
                          <p className={`text-xs ${isMe ? 'text-blue-100' : 'text-zinc-400'}`}>
                            Original: "{msg.text}"
                          </p>
                        </>
                      ) : (
                        <p>{msg.text}</p>
                      )}

                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
               <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   disabled={isTranslating}
                   placeholder={isTranslationMode ? `Type in ${LANGUAGES.find(l=>l.id===fromLang)?.name}...` : "Type a message..."}
                   className={`flex-1 pl-4 pr-12 py-3 rounded-xl border bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 transition-all ${
                      isTranslationMode 
                        ? 'border-purple-200 focus:border-purple-500 focus:ring-purple-100' 
                        : 'border-zinc-200 dark:border-zinc-700 focus:ring-blue-100 focus:border-blue-500'
                   }`}
                 />
                 <button 
                   type="submit"
                   disabled={isTranslating}
                   className={`px-5 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50 ${
                      isTranslationMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                   }`}
                 >
                   {isTranslating ? 'Wait...' : 'Send'}
                 </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-3xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Your Family Chat</h3>
            <p className="text-sm max-w-xs mt-2">Select a family member to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}