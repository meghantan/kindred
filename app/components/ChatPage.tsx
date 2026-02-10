'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, query, where, onSnapshot, orderBy, addDoc, 
  serverTimestamp, updateDoc, doc, getDocs 
} from 'firebase/firestore'; // Added updateDoc and doc

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
  
  // Notification State
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  
  const [isTranslationMode, setIsTranslationMode] = useState(false);
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Family Members
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

  // 2. Fetch Global Unread Notifications for current user
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

  // 3. Clear Notifications when a chat is opened
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

  // 4. Fetch Messages for selected chat
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

// app/components/ChatPage.tsx

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

    // Updated fallback logic to include Hokkien common phrases
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

    // Existing Gen Z / Elder English fallback logic
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
      // Fallback translation logic from Turn 16
      finalTranslatedText = `[AI ${toLang}]: ${originalText}`; 
      setIsTranslating(false);
    }

    // A. Add to messages collection
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: originalText,
      translatedText: finalTranslatedText,
      senderId: user.uid,
      createdAt: serverTimestamp(),
      fromLang: isTranslationMode ? fromLang : null,
      toLang: isTranslationMode ? toLang : null
    });

    // B. Create a notification for the recipient
    await addDoc(collection(db, "notifications"), {
      recipientId: selectedMember.uid,
      senderId: user.uid,
      text: originalText,
      type: 'chat',
      isRead: false,
      createdAt: serverTimestamp()
    });
  };

  const getUnreadCount = (memberUid: string) => {
    return unreadNotifications.filter(n => n.senderId === memberUid).length;
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
          {familyMembers.map((member) => {
            const count = getUnreadCount(member.uid);
            return (
              <button
                key={member.uid}
                onClick={() => setSelectedMember(member)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                  selectedMember?.uid === member.uid 
                    ? 'bg-[#F6CBB7]/30 shadow-sm ring-1 ring-[#9C2D41]/20' 
                    : 'hover:bg-[#F6CBB7]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-[#FAF7F4] flex items-center justify-center font-medium text-lg">
                    {member.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-[#9C2D41]">{member.name}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-[#CB857C]/10 text-[#9C2D41] uppercase font-medium tracking-wider">
                      {member.role}
                    </span>
                  </div>
                </div>
                {/* Notification Badge */}
                {count > 0 && (
                  <div className="bg-[#9C2D41] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {count}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE: CHAT */}
      <div className="flex-1 flex flex-col relative bg-[#FAF7F4]">
        {selectedMember ? (
          <>
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
                  isTranslationMode ? 'bg-[#9C2D41] text-[#FAF7F4]' : 'bg-white text-[#CB857C]'
                }`}
              >
                {isTranslationMode ? 'AI Active' : 'Translate'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF7F4]">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm shadow-sm ${
                      isMe ? 'bg-[#9C2D41] text-[#FAF7F4] rounded-tr-none' : 'bg-white text-[#9C2D41] border border-[#CB857C]/20 rounded-tl-none'
                    }`}>
                      {msg.translatedText ? (
                        <>
                          <p className="font-normal">{msg.translatedText}</p>
                          <hr className="my-2 opacity-20" />
                          <p className="text-xs opacity-70 italic">Original: {msg.text}</p>
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

            <div className="p-4 border-t border-[#CB857C]/10 bg-white/80 backdrop-blur-sm">
               <form onSubmit={handleSendMessage} className="flex gap-2">
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   placeholder="Type a message..."
                   className="flex-1 px-4 py-3 rounded-xl border border-[#CB857C]/30 focus:ring-2 focus:ring-[#9C2D41]/20 outline-none text-[#9C2D41]"
                 />
                 <button type="submit" className="bg-[#9C2D41] px-5 rounded-xl font-medium text-[#FAF7F4]">Send</button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#CB857C] p-8 text-center">
            <h3 className="text-lg font-medium text-[#9C2D41]">Your Family Chat</h3>
            <p className="text-sm max-w-xs mt-2 font-light">Select a family member to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}