'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/library/firebase';

interface ExistingMember {
  uid: string;
  name: string;
  generation: number;
  originalGeneration: number; // Track the real DB generation
  photoURL: string | null;
  connectedTo?: string;
  connectionType?: string;
}

export default function Onboarding() {
  const auth = getAuth();
  const user = auth.currentUser;
  const router = useRouter();

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
          
          console.log('📥 Fetched member:', {
            name: data.name,
            connectedTo: data.connectedTo,
            connectionType: data.connectionType,
            generation: originalGen
          });
          
          members.push({ 
            uid: doc.id, 
            name: data.name, 
            generation: originalGen,
            originalGeneration: originalGen, // Store original
            photoURL: data.photoURL,
            connectedTo: data.connectedTo,
            connectionType: data.connectionType
          });
        }
      });
      
      // Normalize generations to start from 1 (for display only)
      const sortedMembers = members.sort((a, b) => a.generation - b.generation);
      const minGen = sortedMembers.length > 0 ? sortedMembers[0].generation : 0;
      const normalizedMembers = sortedMembers.map(member => ({
        ...member,
        generation: member.generation - minGen + 1
      }));
      
      console.log('✅ Normalized members:', normalizedMembers.map(m => ({
        name: m.name,
        generation: m.generation,
        originalGeneration: m.originalGeneration,
        connectedTo: m.connectedTo,
        connectionType: m.connectionType
      })));
      
      setExistingMembers(normalizedMembers);
    };
    fetchFamily();
  }, [user]);

  // Calculate generation based on relationship (using original DB generations)
  const calculatedGeneration = () => {
    if (!selectedAnchor) return 1;
    if (relationshipType === 'child') return selectedAnchor.originalGeneration + 1;
    if (relationshipType === 'parent') return selectedAnchor.originalGeneration - 1;
    return selectedAnchor.originalGeneration; // Partner/Sibling same generation
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let finalConnectedTo = selectedAnchor ? selectedAnchor.uid : null;
      let finalConnectionType = relationshipType;

      console.log('🔍 ONBOARDING DEBUG:', {
        selectedAnchorName: selectedAnchor?.name,
        selectedAnchorConnectedTo: selectedAnchor?.connectedTo,
        selectedAnchorConnectionType: selectedAnchor?.connectionType,
        relationshipType: relationshipType
      });

      // For siblings, connect to the parent if available
      if (relationshipType === 'sibling' && selectedAnchor) {
        console.log('👥 Processing sibling relationship...');
        if (selectedAnchor.connectedTo && selectedAnchor.connectionType === 'child') {
          // Connect to the same parent
          finalConnectedTo = selectedAnchor.connectedTo;
          finalConnectionType = 'child';
          console.log('✅ Sibling has parent! Connecting to parent:', finalConnectedTo);
        } else {
          console.log('⚠️ Sibling has no parent, keeping direct sibling connection');
        }
      }

      // For parent relationship, we need to update the child to point to us
      if (relationshipType === 'parent' && selectedAnchor) {
        console.log('👴 Processing parent relationship - will update child record');
        // The new user (parent) should NOT have connectedTo pointing to child
        // Instead, the child should point to the parent
        finalConnectedTo = null;
        finalConnectionType = null;
      }

      console.log('💾 Final values:', {
        finalConnectedTo,
        finalConnectionType,
        calculatedGeneration: calculatedGeneration()
      });

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
      
      // CRITICAL FIX: If joining as parent, update the child to point to this new parent
      if (relationshipType === 'parent' && selectedAnchor) {
        console.log('🔄 Updating child record to point to new parent');
        await setDoc(doc(db, "users", selectedAnchor.uid), {
          connectedTo: user.uid,
          connectionType: 'child'
        }, { merge: true });
        console.log('✅ Child record updated');
      }
      
      await setDoc(doc(db, "families", "family_demo_123"), {
        name: "The Tan Family",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.location.href = '/'; 

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">👋</div>
          <h1 className="text-2xl font-bold text-center mb-2">Welcome to Kindred</h1>
          <p className="text-center text-zinc-500 mb-8">Let's get to know you first.</p>
          
          <label className="block text-sm font-bold text-zinc-700 mb-2">What are your hobbies?</label>
          <input
            type="text"
            className="w-full p-4 rounded-xl border border-zinc-200 mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Hiking, Cooking, Tech..."
            value={interests}
            onChange={e => setInterests(e.target.value)}
          />
          <p className="text-xs text-zinc-400 mb-8">Separate with commas.</p>

          <button 
            onClick={() => setStep(2)}
            disabled={!interests}
            className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold disabled:opacity-50 hover:scale-[1.02] transition-transform"
          >
            Next: Find My Place
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: TREE PLACEMENT
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50">
      <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 bg-white z-10">
          <h2 className="text-xl font-bold text-center">Where do you fit in?</h2>
          <p className="text-center text-zinc-500 text-sm">Select a family member to connect to.</p>
        </div>

        {/* Visual Tree Area */}
        <div className="flex-1 bg-zinc-50/50 relative overflow-y-auto p-8">
          {existingMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
               <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm">👑</div>
               <h3 className="font-bold text-lg">You are the first!</h3>
               <p className="text-zinc-500 max-w-xs text-sm mt-2">You will start the tree as Generation 1. Others can join and connect to you later.</p>
            </div>
          ) : (
            <div className="space-y-8">
               {uniqueGenerations.map(gen => {
                 const members = existingMembers.filter(m => m.generation === gen);
                 return (
                   <div key={gen} className="relative">
                     <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-center mb-4">Generation {gen}</div>
                     <div className="flex justify-center gap-4 flex-wrap">
                       {members.map(member => (
                         <button
                           key={member.uid}
                           onClick={() => { setSelectedAnchor(member); setRelationshipType(null); }}
                           className={`flex flex-col items-center transition-all ${
                             selectedAnchor?.uid === member.uid ? 'scale-110' : 'opacity-70 hover:opacity-100'
                           }`}
                         >
                           <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 shadow-sm bg-white
                             ${selectedAnchor?.uid === member.uid ? 'border-blue-500 ring-4 ring-blue-100' : 'border-white'}
                           `}>
                             {member.name[0]}
                           </div>
                           <span className="text-xs font-bold mt-2 bg-white px-2 py-1 rounded-full shadow-sm">{member.name}</span>
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
        <div className="p-6 border-t border-zinc-100 bg-white z-20">
          {existingMembers.length === 0 ? (
             <button onClick={handleSubmit} className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold">
               Plant the Tree 🌳
             </button>
          ) : (
             <>
               {!selectedAnchor ? (
                 <div className="text-center text-zinc-400 text-sm py-2">Tap a person above to connect...</div>
               ) : (
                 <div className="animate-in slide-in-from-bottom-4">
                   <p className="text-center text-sm font-bold text-zinc-800 mb-4">
                     I am <span className="text-blue-600">{selectedAnchor.name}'s</span>...
                   </p>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                     {[
                       { id: 'partner', label: 'Partner ❤️', desc: 'Same Generation' },
                       { id: 'child', label: 'Child 👶', desc: 'Next Generation' },
                       { id: 'sibling', label: 'Sibling 🤝', desc: 'Same Generation' },
                       { id: 'parent', label: 'Parent 👴', desc: 'Previous Gen' }
                     ].map((rel) => (
                       <button
                         key={rel.id}
                         onClick={() => setRelationshipType(rel.id)}
                         className={`p-3 rounded-xl border text-left transition-all ${
                           relationshipType === rel.id 
                             ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                             : 'border-zinc-200 hover:border-zinc-300'
                         }`}
                       >
                         <div className="font-bold text-sm text-zinc-900">{rel.label}</div>
                         <div className="text-[10px] text-zinc-500">{rel.desc}</div>
                       </button>
                     ))}
                   </div>
                   <button 
                     onClick={handleSubmit}
                     disabled={!relationshipType || isSubmitting}
                     className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
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