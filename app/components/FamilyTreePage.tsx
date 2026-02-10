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

const UserAvatar = ({ name, url }: { name: string, url?: string }) => {
  const [imageError, setImageError] = useState(false);
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  return (
    <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-xl bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden shrink-0 transition-all hover:scale-105 hover:shadow-2xl">
      {!imageError && url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <span className="text-xl font-bold text-blue-600">{initials}</span>
      )}
    </div>
  );
};

export default function FamilyTreePage() {
  const { userData } = useAuth();
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
      
      // Normalize generations to start from 1
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
    
    // Clear existing lines
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rect = container.getBoundingClientRect();
    svg.setAttribute('width', rect.width.toString());
    svg.setAttribute('height', rect.height.toString());

    const containerRect = container.getBoundingClientRect();

    // Get center position of each member's avatar
    const getPos = (id: string) => {
      const node = itemsRef.current[id];
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      // Get position of the avatar circle (first child)
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

    // Track couple midpoints for children
    const coupleMidpoints = new Map<string, {x: number, y: number}>();

    // Helper to create SVG line
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
        line.setAttribute('stroke-dasharray', '10 6');
      }
      svg.appendChild(line);
    };

    // STEP 1: Draw partner relationships (horizontal dashed pink lines at avatar center)
    members.forEach(person => {
      if (person.connectionType === 'partner' && person.connectedTo) {
        const myPos = positions.get(person.id);
        const partnerPos = positions.get(person.connectedTo);
        
        if (myPos && partnerPos) {
          // Draw line at the exact center height of avatars
          createLine(myPos.x, myPos.y, partnerPos.x, partnerPos.y, '#ec4899', 3.5, true);
          
          // Store midpoint for children
          const midX = (myPos.x + partnerPos.x) / 2;
          const midY = (myPos.y + partnerPos.y) / 2;
          coupleMidpoints.set(person.id, {x: midX, y: midY});
          coupleMidpoints.set(person.connectedTo, {x: midX, y: midY});
        }
      }
    });

    // STEP 2: Draw parent-child relationships (clean lines from parent to child)
    members.forEach(child => {
      if (child.connectionType === 'child' && child.connectedTo) {
        const childPos = positions.get(child.id);
        if (!childPos) return;

        // Check if parent is part of a couple
        let parentPos = coupleMidpoints.get(child.connectedTo);
        
        if (!parentPos) {
          // Single parent
          const pos = positions.get(child.connectedTo);
          if (pos) parentPos = pos;
        }

        if (parentPos) {
          // Draw straight line from parent to child
          createLine(parentPos.x, parentPos.y, childPos.x, childPos.y, '#64748b', 3);
        }
      }
    });

    // STEP 3: Draw parent relationships (child connecting upward)
    members.forEach(parent => {
      if (parent.connectionType === 'parent' && parent.connectedTo) {
        const parentPos = positions.get(parent.id);
        const childPos = positions.get(parent.connectedTo);
        
        if (parentPos && childPos) {
          createLine(parentPos.x, parentPos.y, childPos.x, childPos.y, '#64748b', 3);
        }
      }
    });
  };

  useEffect(() => {
    if (members.length > 0) {
      // Initial draw with longer delay to ensure DOM is ready
      const timer = setTimeout(drawAllLines, 800);
      
      window.addEventListener('resize', drawAllLines);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', drawAllLines);
      };
    }
  }, [members]);

  const uniqueGenerations = Array.from(new Set(members.map(m => m.generation))).sort((a,b) => a-b);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 shadow-lg">
          <span className="text-3xl">🌳</span>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent mb-2">
          Our Family Tree
        </h1>
        <p className="text-zinc-500 text-lg">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
      </div>

      <div 
        ref={containerRef} 
        className="rounded-3xl border-2 border-zinc-200 shadow-2xl relative min-h-[700px] py-24 px-12 bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/80"
      >
        <svg 
          ref={svgRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        />

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-lg text-zinc-400">Loading family tree...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-32 relative" style={{ zIndex: 20 }}>
            {uniqueGenerations.map(gen => {
              return (
                <div key={gen} className="flex items-center gap-8">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    Gen {gen}
                  </div>
                  <div className="flex-1 flex justify-center gap-32 flex-wrap">
                    {members.filter(m => m.generation === gen).map(member => (
                      <div 
                        key={member.id}
                        ref={(el) => {
                          itemsRef.current[member.id] = el;
                          // Trigger redraw when all refs are ready
                          if (el) {
                            const allRefsReady = members.every(m => itemsRef.current[m.id]);
                            if (allRefsReady) {
                              setTimeout(drawAllLines, 100);
                            }
                          }
                        }}
                        className="flex flex-col items-center group cursor-pointer"
                      >
                        <UserAvatar name={member.name} url={member.photoURL} />
                        <div className="mt-4 bg-white/95 backdrop-blur-sm border-2 border-zinc-200 px-5 py-2.5 rounded-2xl shadow-lg group-hover:shadow-xl group-hover:border-blue-300 transition-all">
                          <p className="text-base font-bold text-zinc-900">{member.name}</p>
                          {member.role && (
                            <p className="text-xs text-zinc-500 capitalize mt-0.5">{member.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-8 flex justify-center gap-8 text-sm text-zinc-600">
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-md border border-zinc-200">
          <div className="w-12 h-1 bg-pink-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ec4899 0, #ec4899 10px, transparent 10px, transparent 16px)' }}></div>
          <span className="font-medium">Partners</span>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-md border border-zinc-200">
          <div className="w-12 h-1 bg-slate-500 rounded"></div>
          <span className="font-medium">Parent-Child</span>
        </div>
      </div>
    </div>
  );
}