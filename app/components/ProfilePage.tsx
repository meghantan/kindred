'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/library/firebase';

const MASTER_SKILLS = [
  "Technology", "Cooking", "Driving", 
  "Groceries", "Gardening", "Pets",
  "Fitness", "Reading", "Music", 
  "Art", "Cleaning", "Finance",
  "Baking", "Singing"
];

const Icons = {
  Sparkles: () => (
    <svg className="w-4 h-4 text-[#9C2D41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4 text-[#CB857C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
};

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { userData, logOut } = useAuth();
  
  const [interests, setInterests] = useState<string[]>(userData?.interests || []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(userData?.name || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData?.interests) {
      setInterests(userData.interests);
    }
  }, [userData?.interests]);

  if (!userData) return null;

  const toggleInterest = async (tag: string) => {
    const tagLower = tag.toLowerCase().trim();
    const isSelected = interests.includes(tagLower);
    const userRef = doc(db, "users", userData.uid);

    if (isSelected) {
      await updateDoc(userRef, { interests: arrayRemove(tagLower) });
    } else {
      await updateDoc(userRef, { interests: arrayUnion(tagLower) });
    }
  };

  const addCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTag.trim();
    if (!tag) return;
    await toggleInterest(tag);
    setCustomTag('');
    setIsAddingCustom(false);
  };

  const saveName = async () => {
    if (!editedName.trim() || editedName === userData.name) {
      setIsEditingName(false);
      return;
    }
    const userRef = doc(db, "users", userData.uid);
    await updateDoc(userRef, { name: editedName.trim() });
    setIsEditingName(false);
    window.location.reload();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 800 * 1024) {
      alert('Please upload an image under 800KB');
      return;
    }
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      const userRef = doc(db, "users", userData.uid);
      await updateDoc(userRef, { photoURL: base64Image });
      window.location.reload();
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    if (confirm("Log out of Kindred?")) {
      setIsLoggingOut(true);
      await logOut();
    }
  };

  const initials = userData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const masterSkillsLower = MASTER_SKILLS.map(s => s.toLowerCase());
  
  // Separation logic
  const manualInterests = interests.filter(i => masterSkillsLower.includes(i));
  const aiInterests = interests.filter(i => !masterSkillsLower.includes(i));

  return (
    <div className="min-h-screen bg-[#FAF7F4] pt-8 pb-20 px-4">
      <div className="max-w-xl mx-auto bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-xl border border-[#CB857C]/20 overflow-hidden relative">
        <div className="h-40 bg-gradient-to-r from-[#9C2D41] to-[#CB857C] relative">
          <button onClick={onBack} className="absolute top-6 left-6 bg-[#FAF7F4]/20 backdrop-blur-md text-[#FAF7F4] px-4 py-2 rounded-full text-sm font-medium border border-[#FAF7F4]/30">
            ← Back
          </button>
        </div>

        <div className="px-8 pb-10">
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-white p-2 shadow-2xl ring-4 ring-white">
                {userData.photoURL ? (
                  <img src={userData.photoURL} alt={userData.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-3xl font-medium text-[#FAF7F4]">
                    {initials}
                  </div>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-10 h-10 bg-[#9C2D41] rounded-full flex items-center justify-center text-[#FAF7F4] shadow-lg">
                {isUploadingPhoto ? '...' : '📸'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>

          <div className="text-center mb-10">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 mb-2">
                <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="text-3xl font-light text-[#9C2D41] text-center border-b-2 border-[#9C2D41] outline-none bg-transparent" autoFocus />
                <button onClick={saveName} className="text-[#9C2D41]">✓</button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-2 group">
                <h1 className="text-3xl font-light text-[#9C2D41] tracking-tight">{userData.name}</h1>
                <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 text-[#CB857C]">✎</button>
              </div>
            )}
            <p className="text-[#CB857C] text-sm mt-1 mb-4 font-light">{userData.email}</p>
            <div className="inline-flex items-center gap-2 bg-[#F6CBB7]/20 p-1.5 rounded-full border border-[#CB857C]/20">
              <span className="px-4 py-1 rounded-full bg-white text-xs font-medium text-[#9C2D41] uppercase">{userData.role}</span>
            </div>
          </div>

          <div className="space-y-10">
            {/* SEGMENT 1: USER SELECTIONS */}
            <section>
              <div className="flex items-center gap-2 mb-4 px-1">
                <Icons.User />
                <h3 className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest">My Selections</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {MASTER_SKILLS.map((skill) => {
                  const isActive = manualInterests.includes(skill.toLowerCase());
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleInterest(skill)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border
                        ${isActive ? 'bg-[#9C2D41] border-[#9C2D41] text-[#FAF7F4] shadow-md' : 'bg-white border-[#CB857C]/30 text-[#CB857C]'}`}
                    >
                      {skill}
                    </button>
                  );
                })}

                {!isAddingCustom ? (
                  <button onClick={() => setIsAddingCustom(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-[#CB857C]/30 text-[#CB857C] hover:text-[#9C2D41] transition-colors">+ Custom</button>
                ) : (
                  <form onSubmit={addCustomTag} className="flex gap-2">
                    <input autoFocus type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="Interest..." className="w-24 px-3 py-2 rounded-xl text-sm border border-[#9C2D41] outline-none" />
                    <button type="submit" className="bg-[#9C2D41] text-white px-3 rounded-xl">✓</button>
                  </form>
                )}
              </div>
            </section>
            
            {/* SEGMENT 2: AI DISCOVERED */}
            <section className="p-6 bg-[#FAF7F4] rounded-[2rem] border border-[#CB857C]/10 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icons.Sparkles />
                  <h3 className="text-xs font-bold text-[#9C2D41] uppercase tracking-widest">AI Discovered</h3>
                </div>
                <span className="text-[10px] text-[#CB857C] italic">Auto-summarized from posts</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {aiInterests.length > 0 ? aiInterests.map(tag => (
                  <div key={tag} className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-[#9C2D41] border border-[#CB857C]/20 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-bottom-1 transition-all">
                    <span className="capitalize">{tag}</span>
                    <button 
                      onClick={() => toggleInterest(tag)} 
                      className="text-[#CB857C] hover:text-[#9C2D41] ml-1 font-bold text-lg leading-none"
                      title="Remove interest"
                    >
                      ×
                    </button>
                  </div>
                )) : (
                  <p className="text-xs text-[#CB857C] font-light italic">Share moments in the Feed to see your interests grow!</p>
                )}
              </div>
            </section>
          </div>

          <div className="pt-8 mt-10 border-t border-[#CB857C]/10">
            <button onClick={handleLogout} disabled={isLoggingOut} className="w-full py-4 rounded-xl text-[#9C2D41] font-medium bg-[#F6CBB7]/20 border border-[#CB857C]/20 transition-all hover:bg-[#F6CBB7]/30">
              {isLoggingOut ? 'Signing Out...' : 'Log Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}