'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, db } from '@/library/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userData: any;
  familyMembers: any[];
  getRelationship: (targetId: string) => string;
  googleSignIn: () => void;
  logOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Auth & Real-time User Data Listener
  useEffect(() => {
    let unsubscribeDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        
        // FIX: Use onSnapshot instead of getDoc so userData syncs automatically when updated!
        const docRef = doc(db, "users", currentUser.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData(null);
          }
          setLoading(false);
        });

      } else {
        setUser(null);
        setUserData(null);
        setFamilyMembers([]);
        if (unsubscribeDoc) unsubscribeDoc();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // 2. Family Data Listener
  useEffect(() => {
    if (!userData?.familyId) return;
    const q = query(collection(db, "users"), where("familyId", "==", userData.familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members: any[] = [];
      snapshot.forEach(doc => members.push({ uid: doc.id, ...doc.data() }));
      setFamilyMembers(members);
    });
    return () => unsubscribe();
  }, [userData?.familyId]); // Optimize dependency array

  // 3. The "Infinite Generation" Calculator
  const getRelationship = useCallback((targetId: string): string => {
    if (!user || !familyMembers.length) return "";
    if (targetId === user.uid) return "Me";

    const target = familyMembers.find(m => m.uid === targetId);
    if (!target) return "Member";

    // --- GRAPH HELPERS ---
    const findPartnerId = (pid: string) => {
      const p = familyMembers.find(m => m.uid === pid);
      if (p?.connectionType === 'partner') return p.connectedTo;
      const other = familyMembers.find(m => m.connectionType === 'partner' && m.connectedTo === pid);
      return other?.uid || null;
    };

    const findParentIds = (childId: string): string[] => {
      const child = familyMembers.find(m => m.uid === childId);
      const parents: string[] = [];
      if (child?.connectionType === 'child' && child.connectedTo) {
        parents.push(child.connectedTo);
        const parentPartner = findPartnerId(child.connectedTo);
        if (parentPartner) parents.push(parentPartner);
      }
      return parents;
    };

    // --- ALGORITHM: LOWEST COMMON ANCESTOR (LCA) ---
    const getBloodDistance = (startId: string, endId: string): { up: number, down: number } | null => {
      const startAncestors = new Map<string, number>();
      const queue = [{ id: startId, dist: 0 }];
      startAncestors.set(startId, 0);
      
      let head = 0;
      while(head < queue.length) {
        const { id, dist } = queue[head++];
        const parents = findParentIds(id);
        for(const p of parents) {
          if (!startAncestors.has(p)) {
            startAncestors.set(p, dist + 1);
            queue.push({ id: p, dist: dist + 1 });
          }
        }
      }

      const queueEnd = [{ id: endId, dist: 0 }];
      const visitedEnd = new Set<string>([endId]);
      
      head = 0;
      while(head < queueEnd.length) {
        const { id, dist: downDist } = queueEnd[head++];
        
        if (startAncestors.has(id)) {
          return { up: startAncestors.get(id)!, down: downDist };
        }

        const parents = findParentIds(id);
        for(const p of parents) {
          if (!visitedEnd.has(p)) {
            visitedEnd.add(p);
            queueEnd.push({ id: p, dist: downDist + 1 });
          }
        }
      }
      return null;
    };

    // --- DYNAMIC NAMING GENERATOR ---
    const getNameFromDistance = (up: number, down: number): string | null => {
      if (up === 0 && down === 0) return "Me";
      if (up === 0 && down === 1) return "Child";
      if (up === 1 && down === 0) return "Parent";
      if (up === 1 && down === 1) return "Sibling";
      
      if (up === 0 && down >= 2) {
        const greats = down - 2;
        return (greats > 0 ? "Great-".repeat(greats) : "") + "Grandchild";
      }

      if (up >= 2 && down === 0) {
        const greats = up - 2;
        return (greats > 0 ? "Great-".repeat(greats) : "") + "Grandparent";
      }

      if (up === 2 && down === 1) return "Aunt/Uncle";
      if (up === 1 && down === 2) return "Niece/Nephew";
      if (up >= 2 && down >= 2) return "Cousin"; 
      if (up > 2 && down === 1) return "Great-Aunt/Uncle";
      if (up === 1 && down > 2) return "Great-Niece/Nephew";

      return null;
    };

    // --- FINAL LOGIC CHAIN ---
    const myPartnerId = findPartnerId(user.uid);
    if (myPartnerId === targetId) return "Partner";

    const bloodDist = getBloodDistance(user.uid, targetId);
    if (bloodDist) {
      const name = getNameFromDistance(bloodDist.up, bloodDist.down);
      if (name) return name;
    }

    const targetPartnerId = findPartnerId(targetId);
    if (targetPartnerId) {
       const distToPartner = getBloodDistance(user.uid, targetPartnerId);
       if (distToPartner) {
         const name = getNameFromDistance(distToPartner.up, distToPartner.down);
         if (name) return name + "-in-Law";
       }
    }

    if (myPartnerId) {
      const distFromPartner = getBloodDistance(myPartnerId, targetId);
      if (distFromPartner) {
        const name = getNameFromDistance(distFromPartner.up, distFromPartner.down);
        if (name) return name + "-in-Law";
      }
    }

    return target.role || "Member";
  }, [user, familyMembers]);

  const googleSignIn = () => {
    signInWithPopup(auth, googleProvider);
  };

  const logOut = () => {
    signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      familyMembers,     
      getRelationship,   
      googleSignIn, 
      logOut, 
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);