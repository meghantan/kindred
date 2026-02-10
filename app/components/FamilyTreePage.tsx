'use client';

import { useState } from 'react';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  generation: number; 
  status: 'active' | 'needs_help';
  partnerId?: string; // Tracks who they are linked to
}

export default function FamilyTreePage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Grandpa Tan', relation: 'Grandfather', generation: 1, status: 'needs_help', partnerId: '2' },
    { id: '2', name: 'Grandma Tan', relation: 'Grandmother', generation: 1, status: 'active', partnerId: '1' },
    { id: '3', name: 'Dad', relation: 'Father', generation: 2, status: 'active', partnerId: '4' },
    { id: '4', name: 'Mom', relation: 'Mother', generation: 2, status: 'active', partnerId: '3' },
    { id: '6', name: 'Sarah (You)', relation: 'Self', generation: 3, status: 'active' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const relations = [
    { label: 'Grandfather', gen: 1 }, { label: 'Grandmother', gen: 1 },
    { label: 'Father', gen: 2 }, { label: 'Mother', gen: 2 },
    { label: 'Uncle', gen: 2 }, { label: 'Auntie', gen: 2 },
    { label: 'Brother', gen: 3 }, { label: 'Sister', gen: 3 },
  ];

  const updateRelation = (memberId: string, newRelation: string) => {
    const gen = relations.find(r => r.label === newRelation)?.gen || 3;
    setFamilyMembers(prev =>
      prev.map(m => m.id === memberId ? { ...m, relation: newRelation, generation: gen } : m)
    );
    setIsModalOpen(false);
  };

  const toggleConnect = (id1: string) => {
    const partnerName = prompt("Enter the name of the person to link as a partner (e.g., Grandma Tan):");
    const partner = familyMembers.find(m => m.name.toLowerCase() === partnerName?.toLowerCase());
    
    if (partner) {
      setFamilyMembers(prev => prev.map(m => {
        if (m.id === id1) return { ...m, partnerId: partner.id };
        if (m.id === partner.id) return { ...m, partnerId: id1 };
        return m;
      }));
      alert(`Linked ${partner.name} as partner!`);
    } else {
      alert("Person not found in the tree.");
    }
    setIsModalOpen(false);
  };

  const renderGeneration = (genLevel: number) => {
    const members = familyMembers.filter(m => m.generation === genLevel);
    return (
      <div className="relative flex justify-center gap-12 py-10 border-b border-zinc-100 last:border-0">
        {members.map((member, index) => {
          const hasPartner = member.partnerId && members.some(m => m.id === member.partnerId);
          return (
            <div key={member.id} className="relative flex flex-col items-center group">
              {/* Marriage Link Line (Visual Connector) */}
              {hasPartner && member.id < (member.partnerId || "") && (
                <div className="absolute top-10 left-full w-12 h-0.5 bg-zinc-300 -translate-x-1/2 z-0" />
              )}
              
              <button 
                onClick={() => { setEditingMember(member); setIsModalOpen(true); }}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold border-4 transition-all hover:scale-110 bg-white shadow-md
                  ${member.status === 'needs_help' ? 'border-orange-500 animate-pulse' : 'border-green-400'}`}
              >
                {member.name[0]}
              </button>
              <div className="text-center mt-3">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{member.relation}</p>
                <p className="text-xs font-semibold text-zinc-900">{member.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-2">Kindred Tree</h1>
      <p className="text-center text-zinc-500 mb-10">Tap a circle to edit relations or link family members.</p>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-4">
        {renderGeneration(1)}
        {renderGeneration(2)}
        {renderGeneration(3)}
      </div>

      {isModalOpen && editingMember && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-center">Manage {editingMember.name}</h3>
            <p className="text-center text-zinc-500 text-sm mb-6 font-medium">Define their role in the family ecosystem.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {relations.map(r => (
                <button
                  key={r.label}
                  onClick={() => updateRelation(editingMember.id, r.label)}
                  className="p-3 text-sm border-2 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-500 transition-all text-zinc-700"
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button 
              onClick={() => toggleConnect(editingMember.id)}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold mb-3 hover:bg-zinc-800 transition-colors"
            >
              🔗 Link Partner
            </button>
            
            <button onClick={() => setIsModalOpen(false)} className="w-full text-zinc-400 font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}