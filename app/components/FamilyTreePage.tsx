'use client';

import { useState } from 'react';
import Image from 'next/image';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  photo?: string;
  x: number;
  y: number;
  generation: number;
}

export default function FamilyTreePage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Grandpa Tan', relation: 'Grandfather', x: 200, y: 50, generation: 1 },
    { id: '2', name: 'Grandma Tan', relation: 'Grandmother', x: 350, y: 50, generation: 1 },
    { id: '3', name: 'Dad', relation: 'Father', x: 150, y: 200, generation: 2 },
    { id: '4', name: 'Mom', relation: 'Mother', x: 300, y: 200, generation: 2 },
    { id: '5', name: 'Uncle Ben', relation: 'Uncle', x: 450, y: 200, generation: 2 },
    { id: '6', name: 'Sarah (You)', relation: 'Self', x: 200, y: 350, generation: 3 },
    { id: '7', name: 'Brother Mike', relation: 'Brother', x: 350, y: 350, generation: 3 },
  ]);

  const handleDragStart = (e: React.DragEvent, member: FamilyMember) => {
    if (!isEditMode) return;
    e.dataTransfer.setData('text/plain', member.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    const memberId = e.dataTransfer.getData('text/plain');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 50; // Center the member
    const y = e.clientY - rect.top - 50;

    setFamilyMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, x, y } : member
      )
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Family Tree
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            The Tan Family Heritage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditMode
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}
          >
            {isEditMode ? '✓ Save Changes' : '✏️ Edit Mode'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <div
          className="relative w-full h-96 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-lg overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Grandparents to parents */}
            <line x1="275" y1="100" x2="225" y2="200" stroke="#94a3b8" strokeWidth="2" />
            <line x1="275" y1="100" x2="375" y2="200" stroke="#94a3b8" strokeWidth="2" />
            <line x1="275" y1="100" x2="525" y2="200" stroke="#94a3b8" strokeWidth="2" />
            
            {/* Parents to children */}
            <line x1="225" y1="250" x2="275" y2="350" stroke="#94a3b8" strokeWidth="2" />
            <line x1="375" y1="250" x2="275" y2="350" stroke="#94a3b8" strokeWidth="2" />
            <line x1="375" y1="250" x2="425" y2="350" stroke="#94a3b8" strokeWidth="2" />
          </svg>

          {/* Family members */}
          {familyMembers.map((member) => (
            <div
              key={member.id}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, member)}
              onClick={() => setSelectedMember(member)}
              className={`absolute w-24 h-24 cursor-pointer transition-all ${
                isEditMode ? 'hover:scale-110' : 'hover:scale-105'
              } ${selectedMember?.id === member.id ? 'ring-2 ring-blue-500' : ''}`}
              style={{ left: member.x, top: member.y }}
            >
              <div className="w-full h-full bg-white dark:bg-zinc-700 rounded-full border-2 border-zinc-200 dark:border-zinc-600 shadow-lg flex items-center justify-center overflow-hidden">
                {member.photo ? (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
              <div className="text-center mt-2">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {member.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {member.relation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMember && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {selectedMember.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Relation
              </label>
              <input
                type="text"
                value={selectedMember.relation}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                readOnly={!isEditMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Add Photo
              </label>
              <button
                disabled={!isEditMode}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
              >
                📷 Upload Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
