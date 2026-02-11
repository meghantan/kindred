'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface Relationship {
  uid: string;
  type: 'parent' | 'child' | 'partner' | 'sibling';
  addedAt: string;
}

interface FamilyMember {
  id: string;
  name: string;
  generation: number;
  photoURL?: string;
  role: string;
  relationships: Relationship[];
}

interface FamilyTreePageProps {
  onNavigateToChat?: (member: FamilyMember) => void;
}

const UserAvatar = ({ 
  name, 
  url, 
  isMe, 
  onClick 
}: { 
  name: string; 
  url?: string; 
  isMe?: boolean;
  onClick?: () => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  return (
    <div 
      onClick={onClick}
      className={`w-16 h-16 rounded-full flex items-center justify-center border-3 shadow-sm relative overflow-hidden shrink-0 transition-all ${
        isMe 
          ? 'border-[#F6CBB7]' 
          : 'border-white bg-gradient-to-br from-[#9C2D41] to-[#CB857C]'
      }`}
    >
      {!imageError && url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <span className="text-base font-medium text-[#FAF7F4]">{initials}</span>
      )}
    </div>
  );
};

export default function FamilyTreePage({ onNavigateToChat }: FamilyTreePageProps) {
  const { userData, user, getRelationshipLabel } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<{[key: string]: HTMLDivElement | null}>({});

  useEffect(() => {
    if (!userData?.familyId) return;
    const q = query(collection(db, "users"), where("familyId", "==", userData.familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: FamilyMember[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          name: d.name,
          generation: d.generation !== undefined ? d.generation : 1,
          photoURL: d.photoURL,
          role: d.role,
          relationships: d.relationships || []
        });
      });
      
      const sortedData = data.sort((a,b) => a.generation - b.generation);
      const minGen = sortedData.length > 0 ? sortedData[0].generation : 0;
      const normalizedData = sortedData.map(member => ({
        ...member,
        generation: member.generation - minGen + 1
      }));
      
      setMembers(normalizedData);
    });
    return () => unsubscribe();
  }, [userData]);

  // --- PRE-CALCULATE TOP-DOWN VISUAL LAYOUT ---
  const uniqueGenerations = Array.from(new Set(members.map(m => m.generation))).sort((a,b) => a-b);
  const sortedGenerations: FamilyMember[][] = [];
  let previousGenSorted: FamilyMember[] = [];

  uniqueGenerations.forEach(gen => {
    const membersInGen = members.filter(m => m.generation === gen);
    const couplesHandled = new Set<string>();
    const units: FamilyMember[][] = [];

    // 1. Group couples together
    membersInGen.forEach(member => {
      if (couplesHandled.has(member.id)) return;
      const unit = [member];
      couplesHandled.add(member.id);

      const partnerRel = member.relationships?.find(r => r.type === 'partner');
      if (partnerRel) {
        const partner = membersInGen.find(m => m.id === partnerRel.uid);
        if (partner && !couplesHandled.has(partner.id)) {
          // Always order partners deterministically so they don't swap sides randomly
          if (member.id < partner.id) {
            unit.push(partner);
          } else {
            unit.unshift(partner);
          }
          couplesHandled.add(partner.id);
        }
      }
      units.push(unit);
    });

    // 2. Sort units based on parent's VISUAL INDEX in the PREVIOUS generation
    units.sort((unitA, unitB) => {
      const getParentIndex = (unit: FamilyMember[]) => {
        for (const m of unit) {
          const pRel = m.relationships?.find(r => r.type === 'parent');
          if (pRel) {
            const idx = previousGenSorted.findIndex(prevM => prevM.id === pRel.uid);
            if (idx !== -1) return idx;
          }
        }
        return 999999; // If no parent in prev generation, push to the end
      };

      const idxA = getParentIndex(unitA);
      const idxB = getParentIndex(unitB);

      if (idxA !== idxB) {
        return idxA - idxB;
      }

      // Fallback to alphabetical if they have the same parent or no parent
      return unitA[0].id.localeCompare(unitB[0].id);
    });

    const flattenedSorted = units.flat();
    sortedGenerations.push(flattenedSorted);
    previousGenSorted = flattenedSorted;
  });

  // --- DRAW LINES ---
  const drawAllLines = () => {
    if (!svgRef.current || !containerRef.current || members.length === 0) return;

    const svg = svgRef.current;
    const container = containerRef.current;
    
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const containerRect = container.getBoundingClientRect();
    svg.setAttribute('width', containerRect.width.toString());
    svg.setAttribute('height', containerRect.height.toString());

    const getPos = (id: string) => {
      const node = itemsRef.current[id];
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top
      };
    };

    const positions = new Map<string, {x: number, y: number}>();
    members.forEach(m => {
      const pos = getPos(m.id);
      if (pos) positions.set(m.id, pos);
    });

    const createLine = (x1: number, y1: number, x2: number, y2: number, color: string, width: number, dashed = false) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1.toString());
      line.setAttribute('y1', y1.toString());
      line.setAttribute('x2', x2.toString());
      line.setAttribute('y2', y2.toString());
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', width.toString());
      line.setAttribute('stroke-linecap', 'round');
      if (dashed) {
        line.setAttribute('stroke-dasharray', '8 4');
      }
      svg.appendChild(line);
    };

    // 1. Draw dashed partner lines safely
    const drawnPartners = new Set<string>();

    members.forEach(person => {
      const partnerRels = person.relationships?.filter(r => r.type === 'partner') || [];
      partnerRels.forEach(partnerRel => {
        const myPos = positions.get(person.id);
        const partnerPos = positions.get(partnerRel.uid);
        if (myPos && partnerPos) {
          const coupleKey = [person.id, partnerRel.uid].sort().join('-');
          if (!drawnPartners.has(coupleKey)) {
            createLine(myPos.x, myPos.y, partnerPos.x, partnerPos.y, '#CB857C', 2.5, true);
            drawnPartners.add(coupleKey);
          }
        }
      });
    });

    // 2. Draw parent-child lines (straight diagonal lines)
    members.forEach(child => {
      const parentRels = child.relationships?.filter(r => r.type === 'parent') || [];
      parentRels.forEach(parentRel => {
        const childPos = positions.get(child.id);
        if (!childPos) return;
        
        const parent = members.find(m => m.id === parentRel.uid);
        if (!parent) return;
        
        const parentPos = positions.get(parent.id);
        if (!parentPos) return;

        let startX = parentPos.x;
        let startY = parentPos.y + 35; // Default: start line at the bottom of a single parent's card
        
        // Start the line exactly on the dashed partner line in the center if they have one
        const parentPartnerRel = parent.relationships?.find(r => r.type === 'partner');
        if (parentPartnerRel) {
          const partnerPos = positions.get(parentPartnerRel.uid);
          if (partnerPos) {
             startX = (parentPos.x + partnerPos.x) / 2;
             startY = parentPos.y; 
          }
        }
        
        createLine(startX, startY, childPos.x, childPos.y - 45, '#9C2D41', 2.5);
      });
    });
  };

  useEffect(() => {
    if (members.length > 0) {
      const timer = setTimeout(drawAllLines, 500);
      window.addEventListener('resize', drawAllLines);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', drawAllLines);
      };
    }
  }, [members]);

  const handleMemberClick = (member: FamilyMember) => {
    if (member.id === user?.uid) return;
    if (onNavigateToChat) {
      onNavigateToChat(member);
    }
  };

  return (
    <div className="w-full mx-auto px-8 py-16 pb-32 bg-[#FAF7F4]">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-light text-[#9C2D41] mb-3 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          Our Family Tree
        </h1>
        <p className="text-xl text-[#CB857C] font-light tracking-wide">
          {members.length} {members.length === 1 ? 'Member' : 'Members'}
        </p>
      </div>

      {/* Tree Container */}
      <div 
        ref={containerRef} 
        className="rounded-[3rem] border border-[#CB857C]/20 shadow-xl relative min-h-[500px] py-16 px-10 bg-gradient-to-br from-[#FAF7F4] via-white to-[#F6CBB7]/15 overflow-x-auto"
      >
        <svg 
          ref={svgRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        />

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-32">
            <p className="text-xl text-[#CB857C]/80 font-normal">Loading family tree...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-24 relative" style={{ zIndex: 20 }}>
            {uniqueGenerations.map((gen, index) => {
              // Iterate over our precisely pre-sorted array!
              const membersInThisGen = sortedGenerations[index] || [];

              return (
                <div key={gen} className="flex items-center gap-8">
                  <div className="bg-gradient-to-r from-[#9C2D41] to-[#CB857C] text-[#FAF7F4] px-5 py-2.5 rounded-full text-xs font-medium uppercase tracking-wider shadow-lg whitespace-nowrap">
                    Gen {gen}
                  </div>
                  <div className="flex-1 flex justify-center gap-16 flex-wrap">
                    {membersInThisGen.map(member => {
                      const isMe = member.id === user?.uid;
                      const displayLabel = isMe ? "You" : getRelationshipLabel(member.id);
                      
                      return (
                        <div 
                          key={member.id}
                          ref={(el) => {
                            itemsRef.current[member.id] = el;
                            if (el && members.every(m => itemsRef.current[m.id])) {
                                setTimeout(drawAllLines, 100);
                            }
                          }}
                          className="flex flex-col items-center group relative"
                        >
                          <div 
                            onClick={() => handleMemberClick(member)}
                            className={`flex flex-col items-center p-5 backdrop-blur-sm border rounded-[1.5rem] shadow-lg transition-all hover:scale-105 hover:shadow-xl cursor-pointer min-w-[160px] gap-3 ${
                              isMe 
                                ? 'bg-[#9C2D41] border-[#9C2D41] shadow-xl scale-105' 
                                : 'bg-white/95 border-[#CB857C]/20 hover:border-[#9C2D41]/40'
                            }`}
                          >
                            <UserAvatar 
                              name={member.name} 
                              url={member.photoURL} 
                              isMe={isMe}
                            />
                            
                            <div className="text-center">
                              <p className={`text-lg font-normal ${isMe ? 'text-[#FAF7F4]' : 'text-[#9C2D41]'}`} style={{ fontFamily: 'Georgia, serif' }}>
                                {member.name}
                              </p>
                              
                              <p className={`text-xs font-medium uppercase tracking-wider mt-1 ${isMe ? 'text-[#F6CBB7]' : 'text-[#CB857C]/80'}`}>
                                {displayLabel}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-12 flex justify-center gap-10 text-sm text-[#9C2D41]">
        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-md border border-[#CB857C]/20">
          <svg width="48" height="4" className="overflow-visible"><line x1="0" y1="2" x2="48" y2="2" stroke="#CB857C" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 4"/></svg>
          <span className="font-medium">Partners</span>
        </div>
        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-md border border-[#CB857C]/20">
          <div className="w-12 h-0.5 bg-[#9C2D41] rounded"></div>
          <span className="font-medium">Parent-Child</span>
        </div>
      </div>
    </div>
  );
}