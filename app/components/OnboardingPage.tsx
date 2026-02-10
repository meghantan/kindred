'use client';

import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/library/firebase';

interface ExistingMember {
  uid: string;
  name: string;
  generation: number;
  originalGeneration: number;
  photoURL: string | null;
  connectedTo?: string;
  connectionType?: string;
}

interface OnboardingPageProps {
  onComplete?: () => void; // Callback when onboarding is complete
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const auth = getAuth();
  const user = auth.currentUser;

  // State
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState('');
  const [existingMembers, setExistingMembers] = useState<ExistingMember[]>([]);
  const [selectedAnchor, setSelectedAnchor] = useState<ExistingMember | null>(null);
  const [relationshipType, setRelationshipType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing family on load
  useEffect(() => {
    const fetchFamily = async () => {
      const q = query(collection(db, "users"), where("familyId", "==", "family_demo_123"));
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
            connectedTo: data.connectedTo,
            connectionType: data.connectionType
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
  }, [user]);

  const calculatedGeneration = () => {
    if (!selectedAnchor) return 1;
    if (relationshipType === 'child') return selectedAnchor.originalGeneration + 1;
    if (relationshipType === 'parent') return selectedAnchor.originalGeneration - 1;
    return selectedAnchor.originalGeneration;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let finalConnectedTo = selectedAnchor ? selectedAnchor.uid : null;
      let finalConnectionType = relationshipType;

      if (relationshipType === 'sibling' && selectedAnchor) {
        if (selectedAnchor.connectedTo && selectedAnchor.connectionType === 'child') {
          finalConnectedTo = selectedAnchor.connectedTo;
          finalConnectionType = 'child';
        }
      }

      if (relationshipType === 'parent' && selectedAnchor) {
        finalConnectedTo = null;
        finalConnectionType = null;
      }

      const newProfile = {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL,
        interests: interests.split(',').map((tag) => tag.trim().toLowerCase()).filter(tag => tag !== ''), 
        familyId: "family_demo_123",
        createdAt: new Date().toISOString(),
        generation: calculatedGeneration(),
        role: 'member',
        connectedTo: finalConnectedTo,
        connectionType: finalConnectionType
      };

      await setDoc(doc(db, "users", user.uid), newProfile);
      
      if (relationshipType === 'parent' && selectedAnchor) {
        await setDoc(doc(db, "users", selectedAnchor.uid), {
          connectedTo: user.uid,
          connectionType: 'child'
        }, { merge: true });
      }
      
      await setDoc(doc(db, "families", "family_demo_123"), {
        name: "The Tan Family",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Call the completion callback or redirect
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = '/';
      }

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueGenerations = Array.from(new Set(existingMembers.map(m => m.generation))).sort((a, b) => a - b);

  // STEP 1: INTERESTS
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F4]">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-[#CB857C]/20">
          <div className="w-16 h-16 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-normal text-center mb-2 text-[#9C2D41]">Welcome to Kindred</h1>
          <p className="text-center text-[#CB857C] mb-8 font-light">Let's get to know you first.</p>
          
          <label className="block text-sm font-medium text-[#9C2D41] mb-2">What are your hobbies?</label>
          <input
            type="text"
            className="w-full p-4 rounded-xl border border-[#CB857C]/30 mb-2 focus:ring-2 focus:ring-[#9C2D41] outline-none bg-white text-[#9C2D41] placeholder-[#CB857C]/50"
            placeholder="e.g. Hiking, Cooking, Tech..."
            value={interests}
            onChange={e => setInterests(e.target.value)}
          />
          <p className="text-xs text-[#CB857C]/60 mb-8 font-light">Separate with commas.</p>

          <button 
            onClick={() => setStep(2)}
            disabled={!interests}
            className="w-full py-4 bg-[#9C2D41] text-[#FAF7F4] rounded-xl font-medium disabled:opacity-50 hover:bg-[#CB857C] transition-colors"
          >
            Next: Find My Place
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: TREE PLACEMENT
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FAF7F4]">
      <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] border border-[#CB857C]/20">
        
        {/* Header */}
        <div className="p-6 border-b border-[#CB857C]/10 bg-white/50 z-10">
          <h2 className="text-xl font-normal text-center text-[#9C2D41]">Where do you fit in?</h2>
          <p className="text-center text-[#CB857C] text-sm font-light">Select a family member to connect to.</p>
        </div>

        {/* Visual Tree Area */}
        <div className="flex-1 bg-[#FAF7F4]/50 relative overflow-y-auto p-8">
          {existingMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
               <div className="w-24 h-24 bg-gradient-to-br from-[#9C2D41] to-[#CB857C] rounded-full flex items-center justify-center mb-4 shadow-sm">
                 <svg className="w-12 h-12 text-[#FAF7F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                 </svg>
               </div>
               <h3 className="font-medium text-lg text-[#9C2D41]">You are the first!</h3>
               <p className="text-[#CB857C] max-w-xs text-sm mt-2 font-light">You will start the tree as Generation 1. Others can join and connect to you later.</p>
            </div>
          ) : (
            <div className="space-y-8">
               {uniqueGenerations.map(gen => {
                 const members = existingMembers.filter(m => m.generation === gen);
                 return (
                   <div key={gen} className="relative">
                     <div className="text-[10px] font-medium text-[#CB857C] uppercase tracking-widest text-center mb-4">Generation {gen}</div>
                     <div className="flex justify-center gap-4 flex-wrap">
                       {members.map(member => (
                         <button
                           key={member.uid}
                           onClick={() => { setSelectedAnchor(member); setRelationshipType(null); }}
                           className={`flex flex-col items-center transition-all ${
                             selectedAnchor?.uid === member.uid ? 'scale-110' : 'opacity-70 hover:opacity-100'
                           }`}
                         >
                           <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium border-4 shadow-sm bg-gradient-to-br from-[#9C2D41] to-[#CB857C] text-[#FAF7F4]
                             ${selectedAnchor?.uid === member.uid ? 'border-[#9C2D41] ring-4 ring-[#CB857C]/30' : 'border-white'}
                           `}>
                             {member.name[0]}
                           </div>
                           <span className="text-xs font-medium mt-2 bg-white px-2 py-1 rounded-full shadow-sm text-[#9C2D41]">{member.name}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )
               })}
            </div>
          )}
        </div>

        {/* Connection Panel */}
        <div className="p-6 border-t border-[#CB857C]/10 bg-white/50 z-20">
          {existingMembers.length === 0 ? (
             <button onClick={handleSubmit} className="w-full py-4 bg-[#9C2D41] text-[#FAF7F4] rounded-xl font-medium hover:bg-[#CB857C] transition-colors">
               Plant the Tree
             </button>
          ) : (
             <>
               {!selectedAnchor ? (
                 <div className="text-center text-[#CB857C] text-sm py-2 font-light">Tap a person above to connect...</div>
               ) : (
                 <div>
                   <p className="text-center text-sm font-medium text-[#9C2D41] mb-4">
                     I am <span className="text-[#CB857C]">{selectedAnchor.name}'s</span>...
                   </p>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                     {[
                       { id: 'partner', label: 'Partner', desc: 'Same Generation' },
                       { id: 'child', label: 'Child', desc: 'Next Generation' },
                       { id: 'sibling', label: 'Sibling', desc: 'Same Generation' },
                       { id: 'parent', label: 'Parent', desc: 'Previous Gen' }
                     ].map((rel) => (
                       <button
                         key={rel.id}
                         onClick={() => setRelationshipType(rel.id)}
                         className={`p-3 rounded-xl border text-left transition-all ${
                           relationshipType === rel.id 
                             ? 'bg-[#F6CBB7]/30 border-[#9C2D41] ring-1 ring-[#9C2D41]' 
                             : 'border-[#CB857C]/20 hover:border-[#CB857C]/40 bg-white'
                         }`}
                       >
                         <div className="font-medium text-sm text-[#9C2D41]">{rel.label}</div>
                         <div className="text-[10px] text-[#CB857C] font-light">{rel.desc}</div>
                       </button>
                     ))}
                   </div>
                   <button 
                     onClick={handleSubmit}
                     disabled={!relationshipType || isSubmitting}
                     className="w-full py-3 bg-[#9C2D41] text-[#FAF7F4] rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#CB857C] transition-colors"
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