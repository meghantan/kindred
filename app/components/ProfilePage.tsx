'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useRef } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/library/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MASTER_SKILLS = [
  "Technology 💻", "Cooking 🍳", "Driving 🚗", 
  "Groceries 🛒", "Gardening 🌿", "Pets 🐾",
  "Fitness 🏃", "Reading 📚", "Music 🎵", 
  "Art 🎨", "Cleaning 🧹", "Finance 💰",
  "Baking 🍞"
];

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { userData, logOut } = useAuth();
  
  const [interests, setInterests] = useState<string[]>(userData?.interests || []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTag, setCustomTag] = useState('');
  
  // New state for editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(userData?.name || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!userData) return null;

  // Toggle Interest
  const toggleInterest = async (tag: string) => {
    const isSelected = interests.includes(tag.toLowerCase());
    const userRef = doc(db, "users", userData.uid);
    const tagLower = tag.toLowerCase();

    let newInterests;
    if (isSelected) {
      newInterests = interests.filter(t => t !== tagLower);
    } else {
      newInterests = [...interests, tagLower];
    }
    setInterests(newInterests);

    if (isSelected) {
      await updateDoc(userRef, { interests: arrayRemove(tagLower) });
    } else {
      await updateDoc(userRef, { interests: arrayUnion(tagLower) });
    }
  };

  // Add Custom Tag
  const addCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTag.trim();
    if (!tag) return;

    await toggleInterest(tag);
    setCustomTag('');
    setIsAddingCustom(false);
  };

  // Save Name
  const saveName = async () => {
    if (!editedName.trim() || editedName === userData.name) {
      setIsEditingName(false);
      return;
    }

    const userRef = doc(db, "users", userData.uid);
    await updateDoc(userRef, { name: editedName.trim() });
    setIsEditingName(false);
    window.location.reload(); // Reload to update auth context
  };

  // Upload Photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile-photos/${userData.uid}/${Date.now()}_${file.name}`);
      
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", userData.uid);
      await updateDoc(userRef, { photoURL });
      
      window.location.reload(); // Reload to update auth context
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Log out of Kindred?")) {
      setIsLoggingOut(true);
      await logOut();
    }
  };

  const initials = userData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAF7F4] pt-8 pb-20 px-4">
      
      <div className="max-w-xl mx-auto bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-xl border border-[#CB857C]/20 overflow-hidden relative">
        
        {/* HEADER IMAGE */}
        <div className="h-40 bg-gradient-to-r from-[#9C2D41] to-[#CB857C] relative">
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 bg-[#FAF7F4]/20 backdrop-blur-md text-[#FAF7F4] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#FAF7F4]/30 transition border border-[#FAF7F4]/30"
          >
            ← Back
          </button>
        </div>

        {/* CONTENT CONTAINER */}
        <div className="px-8 pb-10">
          
          {/* AVATAR */}
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-white p-2 shadow-2xl ring-4 ring-white">
                {userData.photoURL ? (
                  <img 
                    src={userData.photoURL} 
                    alt={userData.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-3xl font-medium text-[#FAF7F4]">
                    {initials}
                  </div>
                )}
              </div>
              
              {/* Camera Button Overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-10 h-10 bg-[#9C2D41] rounded-full flex items-center justify-center text-[#FAF7F4] shadow-lg hover:bg-[#CB857C] transition-all group-hover:scale-110 disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* USER INFO */}
          <div className="text-center mb-10">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 mb-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="text-3xl font-light text-[#9C2D41] tracking-tight text-center border-b-2 border-[#9C2D41] outline-none bg-transparent px-2"
                  autoFocus
                />
                <button
                  onClick={saveName}
                  className="text-[#9C2D41] hover:text-[#CB857C] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setEditedName(userData.name);
                    setIsEditingName(false);
                  }}
                  className="text-[#CB857C] hover:text-[#9C2D41] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-2 group">
                <h1 className="text-3xl font-light text-[#9C2D41] tracking-tight">
                  {userData.name}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 text-[#CB857C] hover:text-[#9C2D41] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            
            <p className="text-[#CB857C] text-sm mt-1 mb-4 font-light">{userData.email}</p>
            
            <div className="inline-flex items-center gap-2 bg-[#F6CBB7]/20 p-1.5 rounded-full border border-[#CB857C]/20">
              <span className="px-4 py-1 rounded-full bg-white shadow-sm text-xs font-medium uppercase tracking-wider text-[#9C2D41]">
                {userData.role}
              </span>
              <span className="px-3 text-xs font-mono text-[#CB857C]">
                ID: {userData.familyId}
              </span>
            </div>
          </div>

          {/* SKILLS SELECTOR */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-medium text-[#CB857C] uppercase tracking-widest">
                My Skills & Interests
              </h3>
              <span className="text-xs text-[#CB857C] font-light">
                {interests.length} selected
              </span>
            </div>

            {/* Grid of Options */}
            <div className="flex flex-wrap gap-2">
              {MASTER_SKILLS.map((skill) => {
                const isActive = interests.includes(skill.toLowerCase());
                return (
                  <button
                    key={skill}
                    onClick={() => toggleInterest(skill)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border transform active:scale-95
                      ${isActive 
                        ? 'bg-[#9C2D41] border-[#9C2D41] text-[#FAF7F4] shadow-md' 
                        : 'bg-white border-[#CB857C]/30 text-[#CB857C] hover:border-[#CB857C]'
                      }`}
                  >
                    {skill}
                  </button>
                );
              })}

              {/* Custom Tag Button */}
              {!isAddingCustom ? (
                <button 
                  onClick={() => setIsAddingCustom(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-[#CB857C]/30 text-[#CB857C] hover:text-[#9C2D41] hover:border-[#9C2D41]/30 transition-colors"
                >
                  + Add Custom
                </button>
              ) : (
                <form onSubmit={addCustomTag} className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Type..."
                    className="w-24 px-3 py-2 rounded-xl text-sm border border-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/20 outline-none text-[#9C2D41]"
                    onBlur={() => !customTag && setIsAddingCustom(false)}
                  />
                  <button 
                    type="submit"
                    className="bg-[#9C2D41] text-[#FAF7F4] px-3 rounded-xl text-sm font-medium"
                  >
                    ✓
                  </button>
                </form>
              )}
            </div>
            
            {/* Custom Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.filter(i => !MASTER_SKILLS.map(ms => ms.toLowerCase()).includes(i)).map(custom => (
                 <button
                   key={custom}
                   onClick={() => toggleInterest(custom)}
                   className="px-4 py-2 rounded-xl text-sm font-medium bg-[#F6CBB7]/30 text-[#9C2D41] border border-[#CB857C]/20 flex items-center gap-2 group hover:bg-[#F6CBB7]/50 transition-colors"
                 >
                   {custom}
                   <span className="text-[#CB857C] group-hover:text-[#9C2D41]">×</span>
                 </button>
              ))}
            </div>

          </div>

          {/* LOGOUT */}
          <div className="pt-8 border-t border-[#CB857C]/10">
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-4 rounded-xl text-[#9C2D41] font-medium bg-[#F6CBB7]/20 hover:bg-[#F6CBB7]/30 transition-colors flex items-center justify-center gap-2 border border-[#CB857C]/20"
            >
              {isLoggingOut ? 'Signing Out...' : 'Log Out'}
            </button>
          </div>

        </div>
      </div>
      
      <p className="text-center text-[#CB857C]/40 text-[10px] uppercase tracking-widest mt-8 font-medium">
        Kindred • Luxury Edition
      </p>
    </div>
  );
}