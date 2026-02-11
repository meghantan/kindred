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

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { user, userData, logOut } = useAuth();
  
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTag, setCustomTag] = useState('');
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // FIX: Added image error state to catch broken URLs
  const [imageError, setImageError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync data safely
  useEffect(() => {
    if (userData) {
      setInterests(userData.interests || []);
      setEditedName(userData.name || '');
    }
  }, [userData]);

  if (!userData || !user) return null;

  // Toggle Interest with robust persistence
  const toggleInterest = async (tag: string) => {
    if (!user?.uid) return;
    
    const tagLower = tag.toLowerCase();
    const isSelected = interests.includes(tagLower);
    const userRef = doc(db, "users", user.uid);

    // 1. Optimistic UI update for instant feedback
    setInterests(prev => 
      isSelected ? prev.filter(t => t !== tagLower) : [...prev, tagLower]
    );

    // 2. Database update
    try {
      if (isSelected) {
        await updateDoc(userRef, { interests: arrayRemove(tagLower) });
      } else {
        await updateDoc(userRef, { interests: arrayUnion(tagLower) });
      }
    } catch (error) {
      console.error("Error saving interest to Firebase:", error);
      // Revert if it fails
      setInterests(userData.interests || []);
      alert("Failed to save your selection. Please try again.");
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
    if (!editedName.trim() || editedName === userData.name || !user?.uid) {
      setIsEditingName(false);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name: editedName.trim() });
      setIsEditingName(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to update name:", error);
    }
  };

  // Upload Photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 800 * 1024) {
      alert('Image must be less than 800KB');
      return;
    }

    setIsUploadingPhoto(true);
    setImageError(false); // Reset error state on new upload

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { photoURL: base64Image });
        window.location.reload();
      };
      
      reader.onerror = () => {
        alert('Failed to read image file');
        setIsUploadingPhoto(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message}`);
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Log out of Kindred?")) {
      setIsLoggingOut(true);
      await logOut();
    }
  };

  const initials = userData.name ? userData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      
      {/* Page Navigation */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#CB857C] hover:text-[#9C2D41] font-semibold transition-colors uppercase tracking-widest text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      {/* Main Profile Dashboard */}
      <div className="max-w-4xl mx-auto px-6 pb-32">
        <div className="bg-white rounded-[2rem] shadow-lg border border-[#CB857C]/20 overflow-hidden">
          
          {/* HEADER IMAGE */}
          <div className="h-56 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          </div>

          {/* CONTENT CONTAINER */}
          <div className="px-10 pb-12">
            
            {/* AVATAR */}
            <div className="relative -mt-24 mb-6 flex justify-center">
              <div className="relative group">
                <div className="w-44 h-44 rounded-full bg-white p-1.5 shadow-xl">
                  {/* FIX: Integrated !imageError check and onError handler */}
                  {!imageError && userData.photoURL ? (
                    <img 
                      src={userData.photoURL} 
                      alt={userData.name}
                      className="w-full h-full rounded-full object-cover border border-[#CB857C]/20"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-5xl font-semibold text-[#FAF7F4] border border-[#CB857C]/20">
                      {initials}
                    </div>
                  )}
                </div>
                
                {/* Camera Button Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-2 right-2 w-12 h-12 bg-[#9C2D41] rounded-full flex items-center justify-center text-[#FAF7F4] shadow-lg hover:bg-[#852233] transition-all group-hover:scale-105 disabled:opacity-50 border-[3px] border-white"
                >
                  {isUploadingPhoto ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="text-center mb-12 flex flex-col items-center">
              {isEditingName ? (
                <div className="flex items-center justify-center gap-3 mb-2 relative">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    className="text-4xl font-normal text-[#9C2D41] tracking-tight text-center border-b-2 border-[#CB857C]/40 outline-none bg-transparent px-2 py-1 focus:border-[#9C2D41] transition-colors min-w-[200px]"
                    style={{ fontFamily: 'Georgia, serif' }}
                    autoFocus
                  />
                  <div className="absolute -right-24 flex gap-2">
                    <button
                      onClick={saveName}
                      className="p-1.5 rounded-full bg-[#FAF7F4] text-[#9C2D41] hover:bg-[#F6CBB7]/40 transition-colors border border-[#CB857C]/20 shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setEditedName(userData.name);
                        setIsEditingName(false);
                      }}
                      className="p-1.5 rounded-full bg-white text-[#CB857C] hover:text-[#9C2D41] transition-colors border border-[#CB857C]/20 shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative inline-flex items-center justify-center group mb-2">
                  <h1 className="text-4xl font-normal text-[#9C2D41] tracking-tight text-center" style={{ fontFamily: 'Georgia, serif' }}>
                    {userData.name}
                  </h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="absolute -right-12 opacity-0 group-hover:opacity-100 p-2 rounded-full bg-[#FAF7F4] text-[#CB857C] hover:text-[#9C2D41] hover:bg-[#F6CBB7]/20 transition-all border border-transparent hover:border-[#CB857C]/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              
              <p className="text-[#CB857C] text-[16px] mt-1 mb-5 font-light">{userData.email}</p>
              
              <div className="inline-flex items-center gap-2 bg-[#FAF7F4] p-1.5 rounded-xl border border-[#CB857C]/20 shadow-sm">
                <span className="px-5 py-1.5 rounded-lg bg-white shadow-sm text-xs font-bold uppercase tracking-widest text-[#9C2D41]">
                  {userData.role}
                </span>
                <span className="px-4 text-xs font-bold uppercase tracking-widest text-[#CB857C]/80">
                  ID: {userData.familyId}
                </span>
              </div>
            </div>

            {/* SKILLS SELECTOR */}
            <div className="mb-12 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6 px-1 border-b border-[#CB857C]/10 pb-3">
                <h3 className="text-xs font-bold text-[#9C2D41] uppercase tracking-wider">
                  My Skills & Interests
                </h3>
                <span className="text-[13px] text-[#CB857C] font-semibold">
                  {interests.length} selected
                </span>
              </div>

              {/* Grid of Options */}
              <div className="flex flex-wrap gap-3 justify-center">
                {MASTER_SKILLS.map((skill) => {
                  const isActive = interests.includes(skill.toLowerCase());
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleInterest(skill)}
                      className={`px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-300 border shadow-sm ${
                        isActive 
                          ? 'bg-[#9C2D41] text-[#FAF7F4] border-[#9C2D41] shadow-md'
                          : 'bg-white text-[#CB857C] border-[#CB857C]/30 hover:border-[#9C2D41]/40 hover:text-[#9C2D41] hover:bg-[#FAF7F4]/50'
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
                    className="px-5 py-2.5 rounded-xl text-[14px] font-semibold border border-dashed border-[#CB857C]/40 text-[#CB857C] hover:text-[#9C2D41] hover:border-[#9C2D41]/40 hover:bg-[#FAF7F4]/50 transition-all duration-300 shadow-sm"
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
                      className="w-32 px-4 py-2.5 bg-white rounded-xl outline-none border border-[#CB857C]/30 text-[#9C2D41] focus:border-[#9C2D41]/60 transition-all text-[14px] font-semibold shadow-sm placeholder-[#CB857C]/50"
                      onBlur={() => !customTag && setIsAddingCustom(false)}
                    />
                    <button 
                      type="submit"
                      className="bg-[#9C2D41] text-white px-4 rounded-xl text-sm font-bold shadow-sm hover:bg-[#852233] transition-colors"
                    >
                      ✓
                    </button>
                  </form>
                )}
              </div>
              
              {/* Custom Tags rendering below standard skills */}
              {interests.filter(i => !MASTER_SKILLS.map(ms => ms.toLowerCase()).includes(i)).length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3 justify-center border-t border-[#CB857C]/10 pt-6">
                  {interests.filter(i => !MASTER_SKILLS.map(ms => ms.toLowerCase()).includes(i)).map(custom => (
                     <button
                       key={custom}
                       onClick={() => toggleInterest(custom)}
                       className="px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-white text-[#9C2D41] border border-[#9C2D41]/20 flex items-center gap-2 group hover:shadow-md hover:border-[#9C2D41]/40 transition-all duration-300 shadow-sm"
                     >
                       {custom}
                       <span className="text-[#CB857C] group-hover:text-red-500 font-bold ml-1 transition-colors">×</span>
                     </button>
                  ))}
                </div>
              )}
            </div>

            {/* LOGOUT */}
            <div className="pt-8 border-t border-[#CB857C]/10 max-w-sm mx-auto">
              <button 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full py-4 rounded-xl text-[#9C2D41] font-bold text-[14px] uppercase tracking-widest bg-[#FAF7F4]/80 hover:bg-[#F6CBB7]/30 transition-colors flex items-center justify-center gap-2 border border-[#CB857C]/20 shadow-sm"
              >
                {isLoggingOut ? 'Signing Out...' : 'Log Out'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}