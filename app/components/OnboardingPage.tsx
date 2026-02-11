'use client';

import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/library/firebase';

interface Relationship {
  uid: string;
  type: 'parent' | 'child' | 'partner' | 'sibling';
  addedAt: string;
}

interface ExistingMember {
  uid: string;
  name: string;
  generation: number;
  originalGeneration: number;
  photoURL: string | null;
  relationships: Relationship[];
}

interface OnboardingPageProps {
  onComplete?: () => void;
}

const MASTER_SKILLS = [
  "Technology", "Cooking", "Driving", 
  "Groceries", "Gardening", "Pets",
  "Fitness", "Reading", "Music", 
  "Art", "Cleaning", "Finance",
  "Baking", "Singing"
];

// Generate a random 6-character family code
const generateFamilyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// --- Reusable Avatar Component for Tree ---
const UserAvatar = ({ name, url, isActive, onClick }: { name: string, url?: string | null, isActive: boolean, onClick: () => void }) => {
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    setImageError(false);
  }, [url]);

  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  return (
    <div className="flex flex-col items-center gap-3 relative group cursor-pointer">
      <button
        onClick={onClick}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden transition-all duration-300 transform active:scale-95
          ${isActive 
            ? 'ring-4 ring-offset-4 ring-[#9C2D41] bg-[#9C2D41] scale-110 z-10' 
            : 'ring-2 ring-white border border-[#CB857C]/20 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] group-hover:ring-[#CB857C]/50 hover:scale-105'
          }`}
      >
        {!imageError && url ? (
          <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
        ) : (
          <span className="font-semibold text-2xl text-[#FAF7F4] tracking-wider">{initials}</span>
        )}
      </button>
      <span className={`text-[13px] font-semibold px-4 py-1.5 rounded-full shadow-sm transition-all duration-300 ${
        isActive ? 'bg-[#9C2D41] text-white' : 'bg-white text-[#9C2D41] border border-[#CB857C]/20'
      }`}>
        {name.split(' ')[0]}
      </span>
    </div>
  );
};

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const auth = getAuth();
  const user = auth.currentUser;

  // State
  const [step, setStep] = useState(0); // Start at 0 for family code step
  const [familyMode, setFamilyMode] = useState<'join' | 'create' | null>(null);
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  
  const [existingMembers, setExistingMembers] = useState<ExistingMember[]>([]);
  const [selectedAnchor, setSelectedAnchor] = useState<ExistingMember | null>(null);
  const [relationshipType, setRelationshipType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hobby State
  const [interests, setInterests] = useState<string[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTag, setCustomTag] = useState('');

  // Fetch existing family members once familyId is set
  useEffect(() => {
    if (!familyId) return;
    
    const fetchFamily = async () => {
      const q = query(collection(db, "users"), where("familyId", "==", familyId));
      const snapshot = await getDocs(q);
      const members: ExistingMember[] = [];
      
      snapshot.forEach(doc => {
        if (doc.id !== user?.uid) {
          const data = doc.data();
          const originalGen = data.generation !== undefined ? data.generation : 1;
          
          members.push({ 
            uid: doc.id, 
            name: data.name, 
            generation: originalGen,
            originalGeneration: originalGen,
            photoURL: data.photoURL,
            relationships: data.relationships || []
          });
        }
      });
      
      const sortedMembers = members.sort((a, b) => a.generation - b.generation);
      const minGen = sortedMembers.length > 0 ? sortedMembers[0].generation : 0;
      const normalizedMembers = sortedMembers.map(member => ({
        ...member,
        generation: member.generation - minGen + 1
      }));
      
      setExistingMembers(normalizedMembers);
    };
    fetchFamily();
  }, [familyId, user]);

  // --- Family Code Handlers ---
  const handleJoinFamily = async () => {
    if (!familyCode.trim()) {
      setCodeError('Please enter a family code');
      return;
    }

    setIsValidatingCode(true);
    setCodeError('');

    try {
      // Check if family exists
      const familyDocRef = doc(db, "families", familyCode.toUpperCase());
      const familyDoc = await getDoc(familyDocRef);

      if (!familyDoc.exists()) {
        setCodeError('Family code not found. Please check and try again.');
        setIsValidatingCode(false);
        return;
      }

      // Family exists! Set the familyId and proceed
      setFamilyId(familyCode.toUpperCase());
      setStep(1); // Move to interests step
    } catch (error) {
      console.error('Error validating family code:', error);
      setCodeError('Error validating code. Please try again.');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setCodeError('Please enter a family name');
      return;
    }

    setIsValidatingCode(true);
    setCodeError('');

    try {
      // Generate unique family code
      let newFamilyCode = generateFamilyCode();
      let familyExists = true;

      // Keep generating until we get a unique code
      while (familyExists) {
        const familyDocRef = doc(db, "families", newFamilyCode);
        const familyDoc = await getDoc(familyDocRef);
        if (!familyDoc.exists()) {
          familyExists = false;
        } else {
          newFamilyCode = generateFamilyCode();
        }
      }

      // Create the family document
      await setDoc(doc(db, "families", newFamilyCode), {
        name: familyName,
        code: newFamilyCode,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
        updatedAt: new Date().toISOString()
      });

      setFamilyId(newFamilyCode);
      setFamilyCode(newFamilyCode);
      setStep(1); // Move to interests step
    } catch (error) {
      console.error('Error creating family:', error);
      setCodeError('Error creating family. Please try again.');
    } finally {
      setIsValidatingCode(false);
    }
  };

  // --- Hobby Handlers ---
  const toggleInterest = (tag: string) => {
    const tagLower = tag.toLowerCase();
    setInterests(prev => 
      prev.includes(tagLower) ? prev.filter(t => t !== tagLower) : [...prev, tagLower]
    );
  };

  const addCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTag.trim();
    if (!tag) return;
    toggleInterest(tag);
    setCustomTag('');
    setIsAddingCustom(false);
  };

  // --- Generation Calculation Logic ---
  const calculatedGeneration = () => {
    if (!selectedAnchor) return 1;
    if (relationshipType === 'child') return selectedAnchor.originalGeneration + 1;
    if (relationshipType === 'parent') return selectedAnchor.originalGeneration - 1;
    return selectedAnchor.originalGeneration;
  };

  // --- Submission Logic with Relationships Array ---
  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const timestamp = new Date().toISOString();
      
      const newUserRelationships: Relationship[] = [];
      
      if (relationshipType && selectedAnchor) {
        newUserRelationships.push({
          uid: selectedAnchor.uid,
          type: relationshipType as 'parent' | 'child' | 'partner' | 'sibling',
          addedAt: timestamp
        });
        
        if (relationshipType === 'sibling') {
          const siblingParentRel = selectedAnchor.relationships.find(r => r.type === 'parent');
          if (siblingParentRel) {
            newUserRelationships.push({
              uid: siblingParentRel.uid,
              type: 'child',
              addedAt: timestamp
            });
          }
        }
      }

      const newProfile = {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL,
        interests: interests, 
        familyId: familyId,
        createdAt: timestamp,
        generation: calculatedGeneration(),
        role: 'member',
        relationships: newUserRelationships
      };

      await setDoc(doc(db, "users", user.uid), newProfile);
      
      if (relationshipType && selectedAnchor) {
        const reciprocalType = getReciprocalRelationshipType(relationshipType as any);
        
        const anchorDocRef = doc(db, "users", selectedAnchor.uid);
        const anchorDoc = await getDoc(anchorDocRef);
        const anchorData = anchorDoc.data();
        
        const existingRelationships = anchorData?.relationships || [];
        
        const updatedRelationships = [
          ...existingRelationships,
          {
            uid: user.uid,
            type: reciprocalType,
            addedAt: timestamp
          }
        ];
        
        await setDoc(anchorDocRef, {
          relationships: updatedRelationships
        }, { merge: true });
        
        if (relationshipType === 'sibling') {
          const siblingParentRel = selectedAnchor.relationships.find(r => r.type === 'parent');
          if (siblingParentRel) {
            const parentDocRef = doc(db, "users", siblingParentRel.uid);
            const parentDoc = await getDoc(parentDocRef);
            const parentData = parentDoc.data();
            
            const parentRelationships = parentData?.relationships || [];
            const updatedParentRelationships = [
              ...parentRelationships,
              {
                uid: user.uid,
                type: 'child',
                addedAt: timestamp
              }
            ];
            
            await setDoc(parentDocRef, {
              relationships: updatedParentRelationships
            }, { merge: true });
          }
        }
      }
      
      await setDoc(doc(db, "families", familyId), {
        updatedAt: timestamp
      }, { merge: true });

      if (onComplete) onComplete();
      else window.location.href = '/';

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReciprocalRelationshipType = (type: 'parent' | 'child' | 'partner' | 'sibling'): 'parent' | 'child' | 'partner' | 'sibling' => {
    const reciprocalMap: Record<string, 'parent' | 'child' | 'partner' | 'sibling'> = {
      'parent': 'child',
      'child': 'parent',
      'partner': 'partner',
      'sibling': 'sibling'
    };
    return reciprocalMap[type];
  };

  const uniqueGenerations = Array.from(new Set(existingMembers.map(m => m.generation))).sort((a, b) => a - b);

  // ==========================================
  // STEP 0: JOIN OR CREATE FAMILY
  // ==========================================
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F4] selection:bg-[#9C2D41] selection:text-white">
        <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#CB857C]/20 animate-in slide-in-from-bottom-8 fade-in duration-500">
          
          {/* Header */}
          <div className="p-10 text-center border-b border-[#CB857C]/15">
            <div className="w-20 h-20 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-4xl font-normal text-[#9C2D41] tracking-tight mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Welcome to Kindred
            </h2>
            <p className="text-[#CB857C] text-lg font-light">Let's get you connected with your family.</p>
          </div>
          
          {/* Body */}
          <div className="p-10">
            {!familyMode ? (
              <div className="space-y-4">
                <button
                  onClick={() => setFamilyMode('join')}
                  className="w-full p-6 rounded-2xl border-2 border-[#CB857C]/20 hover:border-[#9C2D41]/40 bg-white hover:bg-[#FAF7F4]/50 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F6CBB7]/30 flex items-center justify-center group-hover:bg-[#9C2D41] transition-colors">
                      <svg className="w-6 h-6 text-[#9C2D41] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#9C2D41] mb-1">Join Existing Family</h3>
                      <p className="text-sm text-[#CB857C] font-light">Enter a family code to connect</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setFamilyMode('create')}
                  className="w-full p-6 rounded-2xl border-2 border-[#CB857C]/20 hover:border-[#9C2D41]/40 bg-white hover:bg-[#FAF7F4]/50 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F6CBB7]/30 flex items-center justify-center group-hover:bg-[#9C2D41] transition-colors">
                      <svg className="w-6 h-6 text-[#9C2D41] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#9C2D41] mb-1">Start New Family</h3>
                      <p className="text-sm text-[#CB857C] font-light">Create a family tree from scratch</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : familyMode === 'join' ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <button
                  onClick={() => { setFamilyMode(null); setCodeError(''); setFamilyCode(''); }}
                  className="text-sm text-[#CB857C] hover:text-[#9C2D41] font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div>
                  <label className="block text-sm font-bold text-[#9C2D41] uppercase tracking-wider mb-3">
                    Enter Family Code
                  </label>
                  <input
                    type="text"
                    value={familyCode}
                    onChange={(e) => { setFamilyCode(e.target.value.toUpperCase()); setCodeError(''); }}
                    placeholder="e.g., ABC123"
                    maxLength={6}
                    className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl outline-none border-2 border-transparent focus:border-[#9C2D41] text-[#9C2D41] text-lg font-bold tracking-widest uppercase transition-all text-center placeholder-[#CB857C]/40"
                  />
                  {codeError && (
                    <p className="text-red-500 text-sm mt-2 font-medium">{codeError}</p>
                  )}
                </div>

                <button
                  onClick={handleJoinFamily}
                  disabled={isValidatingCode || !familyCode.trim()}
                  className="w-full py-4 bg-[#9C2D41] text-white rounded-full text-sm uppercase tracking-widest font-bold hover:bg-[#852233] transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isValidatingCode ? 'Validating...' : 'Join Family'}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <button
                  onClick={() => { setFamilyMode(null); setCodeError(''); setFamilyName(''); }}
                  className="text-sm text-[#CB857C] hover:text-[#9C2D41] font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div>
                  <label className="block text-sm font-bold text-[#9C2D41] uppercase tracking-wider mb-3">
                    Family Name
                  </label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => { setFamilyName(e.target.value); setCodeError(''); }}
                    placeholder="e.g., The Smith Family"
                    className="w-full px-6 py-4 bg-[#FAF7F4] rounded-2xl outline-none border-2 border-transparent focus:border-[#9C2D41] text-[#9C2D41] text-lg font-normal transition-all placeholder-[#CB857C]/40"
                  />
                  {codeError && (
                    <p className="text-red-500 text-sm mt-2 font-medium">{codeError}</p>
                  )}
                  <p className="text-xs text-[#CB857C] mt-3 font-light">
                    We'll generate a unique family code for you to share with others.
                  </p>
                </div>

                <button
                  onClick={handleCreateFamily}
                  disabled={isValidatingCode || !familyName.trim()}
                  className="w-full py-4 bg-[#9C2D41] text-white rounded-full text-sm uppercase tracking-widest font-bold hover:bg-[#852233] transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isValidatingCode ? 'Creating...' : 'Create Family'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 1: WELCOME & INTERESTS
  // ==========================================
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F4] selection:bg-[#9C2D41] selection:text-white">
        <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-[#CB857C]/20 animate-in slide-in-from-bottom-8 fade-in duration-500">
          
          {/* Header */}
          <div className="p-8 border-b border-[#CB857C]/15 bg-white z-20 shadow-sm">
            {familyMode === 'create' && familyCode && (
              <div className="mb-4 p-4 bg-[#F6CBB7]/20 rounded-2xl border border-[#CB857C]/20">
                <p className="text-xs font-bold text-[#9C2D41] uppercase tracking-wider mb-2">Your Family Code</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-[#9C2D41] tracking-widest">{familyCode}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(familyCode);
                      alert('Family code copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-[#9C2D41] text-white rounded-xl text-xs font-bold hover:bg-[#852233] transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-[#CB857C] mt-2 font-light">Share this code with family members to let them join!</p>
              </div>
            )}
            <h2 className="text-4xl font-normal text-[#9C2D41] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Welcome to Kindred.
            </h2>
            <p className="text-[#CB857C] text-lg mt-1 font-light">Let's set up your profile first.</p>
          </div>
          
          {/* Scrollable Body */}
          <div className="flex-1 bg-gradient-to-b from-[#FAF7F4]/80 to-white relative overflow-y-auto p-10 flex flex-col items-center">
            <div className="w-full max-w-2xl mt-4">
              <div className="flex items-center justify-between mb-8 px-2 border-b border-[#CB857C]/10 pb-4">
                <h3 className="text-sm font-bold text-[#9C2D41] uppercase tracking-wider">
                  What are your hobbies & interests?
                </h3>
                <span className="text-[14px] text-[#CB857C] font-semibold">
                  {interests.length} selected
                </span>
              </div>

              {/* Grid of Options */}
              <div className="flex flex-wrap gap-4 justify-center">
                {MASTER_SKILLS.map((skill) => {
                  const isActive = interests.includes(skill.toLowerCase());
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleInterest(skill)}
                      className={`px-6 py-3 rounded-xl text-[14px] font-semibold transition-all duration-300 border shadow-sm ${
                        isActive 
                          ? 'bg-[#9C2D41] text-[#FAF7F4] border-[#9C2D41] shadow-md scale-105'
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
                    className="px-6 py-3 rounded-xl text-[14px] font-semibold border border-dashed border-[#CB857C]/40 text-[#CB857C] hover:text-[#9C2D41] hover:border-[#9C2D41]/40 hover:bg-[#FAF7F4]/50 transition-all duration-300 shadow-sm"
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
                      placeholder="Type here..."
                      className="w-40 px-5 py-3 bg-white rounded-xl outline-none border border-[#CB857C]/30 text-[#9C2D41] focus:border-[#9C2D41]/60 transition-all text-[14px] font-semibold shadow-sm placeholder-[#CB857C]/50"
                      onBlur={() => !customTag && setIsAddingCustom(false)}
                    />
                    <button 
                      type="submit"
                      className="bg-[#9C2D41] text-white px-5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#852233] transition-colors"
                    >
                      ✓
                    </button>
                  </form>
                )}
              </div>

              {/* Custom Tags below */}
              {interests.filter(i => !MASTER_SKILLS.map(ms => ms.toLowerCase()).includes(i)).length > 0 && (
                <div className="mt-8 flex flex-wrap gap-4 justify-center border-t border-[#CB857C]/10 pt-8">
                  {interests.filter(i => !MASTER_SKILLS.map(ms => ms.toLowerCase()).includes(i)).map(custom => (
                     <button
                       key={custom}
                       onClick={() => toggleInterest(custom)}
                       className="px-6 py-3 rounded-xl text-[14px] font-semibold bg-white text-[#9C2D41] border border-[#9C2D41]/20 flex items-center gap-3 group hover:shadow-md hover:border-[#9C2D41]/40 transition-all duration-300 shadow-sm"
                     >
                       {custom}
                       <span className="text-[#CB857C] group-hover:text-red-500 font-bold transition-colors">×</span>
                     </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Panel */}
          <div className="p-8 border-t border-[#CB857C]/15 bg-white z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
            <button 
              onClick={() => setStep(2)}
              disabled={interests.length === 0}
              className="w-full py-4 bg-[#9C2D41] text-[#FAF7F4] rounded-full text-[13px] uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#852233] transition-all shadow-md active:scale-[0.98]"
            >
              Next Step: Find My Place
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2: TREE PLACEMENT
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAF7F4]">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-[#CB857C]/20 animate-in slide-in-from-right-8 fade-in duration-500">
        
        {/* Header */}
        <div className="p-8 border-b border-[#CB857C]/15 bg-white z-20 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-normal text-[#9C2D41] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Where do you fit in?
            </h2>
            <p className="text-[#CB857C] text-lg mt-1 font-light">Select a family member to branch off from.</p>
          </div>
          <button 
            onClick={() => setStep(1)}
            className="text-xs font-bold uppercase tracking-widest text-[#CB857C] hover:text-[#9C2D41] px-5 py-2.5 rounded-full border border-[#CB857C]/20 hover:bg-[#FAF7F4] transition-all shadow-sm"
          >
            ← Back
          </button>
        </div>

        {/* Visual Tree Area */}
        <div className="flex-1 bg-gradient-to-b from-[#FAF7F4]/80 to-white relative overflow-y-auto p-10 flex flex-col items-center">
          {existingMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto animate-in zoom-in duration-500">
               <div className="w-28 h-28 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-white">
                 <svg className="w-12 h-12 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                 </svg>
               </div>
               <h3 className="font-normal text-3xl text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>You are the pioneer!</h3>
               <p className="text-[#CB857C] text-base leading-relaxed font-light">You will plant the seed for this tree as Generation 1. Your family members will connect to you later.</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto space-y-12 relative py-4">

               {uniqueGenerations.map(gen => {
                 const members = existingMembers.filter(m => m.generation === gen);
                 return (
                   <div key={gen} className="relative z-10 w-full animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: `${gen * 100}ms` }}>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#CB857C]/20"></div>
                        <span className="text-[11px] font-bold text-[#CB857C] uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-[#CB857C]/20 shadow-sm">
                          Generation {gen}
                        </span>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#CB857C]/20"></div>
                     </div>
                     
                     <div className="flex justify-center gap-10 flex-wrap">
                       {members.map(member => (
                         <UserAvatar
                           key={member.uid}
                           name={member.name}
                           url={member.photoURL}
                           isActive={selectedAnchor?.uid === member.uid}
                           onClick={() => { setSelectedAnchor(member); setRelationshipType(null); }}
                         />
                       ))}
                     </div>
                   </div>
                 )
               })}
            </div>
          )}
        </div>

        {/* Connection Panel */}
        <div className="p-8 border-t border-[#CB857C]/15 bg-white z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          {existingMembers.length === 0 ? (
             <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 bg-[#9C2D41] text-[#FAF7F4] rounded-full text-[13px] uppercase tracking-widest font-bold hover:bg-[#852233] transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
               {isSubmitting ? 'Planting Tree...' : 'Plant the Tree'}
             </button>
          ) : (
             <>
               {!selectedAnchor ? (
                 <div className="text-center text-[#CB857C] text-[15px] py-8 font-light animate-pulse">
                   Please tap a family member above to connect to their branch...
                 </div>
               ) : (
                 <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                   <p className="text-center text-lg font-normal text-[#9C2D41] mb-5" style={{ fontFamily: 'Georgia, serif' }}>
                     I am <span className="text-[#CB857C] font-semibold">{selectedAnchor.name}'s</span>...
                   </p>
                   
                   <div className="grid grid-cols-2 gap-4 mb-6">
                     {[
                       { id: 'partner', label: 'Partner', desc: 'Same Generation' },
                       { id: 'child', label: 'Child', desc: 'Next Generation' },
                       { id: 'sibling', label: 'Sibling', desc: 'Same Generation' },
                       { id: 'parent', label: 'Parent', desc: 'Previous Generation' }
                     ].map((rel) => (
                       <button
                         key={rel.id}
                         onClick={() => setRelationshipType(rel.id)}
                         className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                           relationshipType === rel.id 
                             ? 'bg-[#9C2D41] border-[#9C2D41] shadow-lg text-white scale-[1.02]' 
                             : 'border-[#CB857C]/20 hover:border-[#9C2D41]/40 bg-[#FAF7F4]/50 hover:bg-white text-[#9C2D41]'
                         }`}
                       >
                         <div className="font-bold text-[14px] uppercase tracking-wider">
                           {rel.label}
                         </div>
                         <div className={`text-[11px] font-medium ${relationshipType === rel.id ? 'text-white/80' : 'text-[#CB857C]'}`}>
                           {rel.desc}
                         </div>
                       </button>
                     ))}
                   </div>

                   <button 
                     onClick={handleSubmit}
                     disabled={!relationshipType || isSubmitting}
                     className="w-full py-4 bg-[#9C2D41] text-[#FAF7F4] rounded-full text-[13px] uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#852233] transition-all shadow-md active:scale-[0.98]"
                   >
                     {isSubmitting ? 'Joining Tree...' : 'Confirm Position'}
                   </button>
                 </div>
               )}
             </>
          )}
        </div>

      </div>
    </div>
  );
}