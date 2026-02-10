'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface FamilyMember {
  id: string;
  name: string;
  generation: number;
  photoURL?: string;
  role: string;
  connectedTo?: string;
  connectionType?: string;
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
  const { userData, user, getRelationship } = useAuth();
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
          connectedTo: d.connectedTo,
          connectionType: d.connectionType
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

  const drawAllLines = () => {
    if (!svgRef.current || !containerRef.current || members.length === 0) return;

    const svg = svgRef.current;
    const container = containerRef.current;
    
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rect = container.getBoundingClientRect();
    svg.setAttribute('width', rect.width.toString());
    svg.setAttribute('height', rect.height.toString());

    const containerRect = container.getBoundingClientRect();

    const getPos = (id: string) => {
      const node = itemsRef.current[id];
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const avatar = node.querySelector('div'); 
      if (avatar) {
        const avatarRect = avatar.getBoundingClientRect();
        return {
          x: avatarRect.left + avatarRect.width / 2 - containerRect.left,
          y: avatarRect.top + avatarRect.height / 2 - containerRect.top
        };
      }
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

    const coupleMidpoints = new Map<string, {x: number, y: number}>();

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

    members.forEach(person => {
      if (person.connectionType === 'partner' && person.connectedTo) {
        const myPos = positions.get(person.id);
        const partnerPos = positions.get(person.connectedTo);
        if (myPos && partnerPos) {
          createLine(myPos.x, myPos.y, partnerPos.x, partnerPos.y, '#CB857C', 2.5, true);
          const midX = (myPos.x + partnerPos.x) / 2;
          const midY = (myPos.y + partnerPos.y) / 2;
          coupleMidpoints.set(person.id, {x: midX, y: midY});
          coupleMidpoints.set(person.connectedTo, {x: midX, y: midY});
        }
      }
    });

    members.forEach(child => {
      if (child.connectionType === 'child' && child.connectedTo) {
        const childPos = positions.get(child.id);
        if (!childPos) return;
        let parentPos = coupleMidpoints.get(child.connectedTo);
        if (!parentPos) {
          const pos = positions.get(child.connectedTo);
          if (pos) parentPos = pos;
        }
        if (parentPos) {
          createLine(parentPos.x, parentPos.y, childPos.x, childPos.y, '#9C2D41', 2.5);
        }
      }
    });

    members.forEach(parent => {
      if (parent.connectionType === 'parent' && parent.connectedTo) {
        const parentPos = positions.get(parent.id);
        const childPos = positions.get(parent.connectedTo);
        if (parentPos && childPos) {
          createLine(parentPos.x, parentPos.y, childPos.x, childPos.y, '#9C2D41', 2.5);
        }
      }
    });
  };

  useEffect(() => {
    if (members.length > 0) {
      const timer = setTimeout(drawAllLines, 800);
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

  const uniqueGenerations = Array.from(new Set(members.map(m => m.generation))).sort((a,b) => a-b);

  return (
    <div className="w-full mx-auto px-8 py-16 pb-32 bg-[#FAF7F4]">
      {/* Header */}
      <div className="text-center mb-20">
        <h1 className="text-6xl font-light text-[#9C2D41] mb-3 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          Our Family Tree
        </h1>
        {/* REFINED: Removed goofy logo, made text elegant */}
        <p className="text-xl text-[#CB857C] font-light tracking-wide">
          {members.length} {members.length === 1 ? 'Member' : 'Members'}
        </p>
      </div>

      {/* Tree Container */}
      <div 
        ref={containerRef} 
        className="rounded-[3rem] border border-[#CB857C]/20 shadow-xl relative min-h-[700px] py-28 px-20 bg-gradient-to-br from-[#FAF7F4] via-white to-[#F6CBB7]/15 overflow-x-auto"
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
          <div className="flex flex-col gap-40 relative" style={{ zIndex: 20 }}>
            {uniqueGenerations.map(gen => {
              return (
                <div key={gen} className="flex items-center gap-8">
                  <div className="bg-gradient-to-r from-[#9C2D41] to-[#CB857C] text-[#FAF7F4] px-5 py-2.5 rounded-full text-xs font-medium uppercase tracking-wider shadow-lg whitespace-nowrap">
                    Gen {gen}
                  </div>
                  <div className="flex-1 flex justify-center gap-40 flex-wrap">
                    {members.filter(m => m.generation === gen).map(member => {
                      const isMe = member.id === user?.uid;
                      const relationship = getRelationship(member.id);
                      
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
                          {/* CARD BOX */}
                          <div 
                            onClick={() => handleMemberClick(member)}
                            className={`flex flex-col items-center p-6 backdrop-blur-sm border rounded-[1.5rem] shadow-lg transition-all hover:scale-105 hover:shadow-xl cursor-pointer min-w-[200px] gap-4 ${
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
                              <p className={`text-xl font-normal ${isMe ? 'text-[#FAF7F4]' : 'text-[#9C2D41]'}`} style={{ fontFamily: 'Georgia, serif' }}>
                                {member.name}
                              </p>
                              
                              <p className={`text-sm font-medium uppercase tracking-wider mt-1 ${isMe ? 'text-[#F6CBB7]' : 'text-[#CB857C]/80'}`}>
                                {isMe ? "You" : relationship}
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