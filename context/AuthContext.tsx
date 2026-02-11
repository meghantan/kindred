'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, db } from '@/library/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

interface Relationship {
  uid: string;
  type: 'parent' | 'child' | 'partner' | 'sibling';
  addedAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: any;
  familyMembers: any[];
  getRelationship: (targetId: string) => string;
  getRelationshipLabel: (targetId: string) => string;
  googleSignIn: () => void;
  logOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
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
        
        const docRef = doc(db, "users", currentUser.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              ...data,
              relationships: data.relationships || []
            });
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
      snapshot.forEach(doc => {
        const data = doc.data();
        members.push({ 
          uid: doc.id, 
          ...data,
          relationships: data.relationships || []
        });
      });
      setFamilyMembers(members);
    });
    return () => unsubscribe();
  }, [userData?.familyId]);

  // 3. The Comprehensive Relationship Graph Calculator
  const getRelationship = useCallback((targetId: string): string => {
    if (!user || !familyMembers.length) return "";
    if (targetId === user.uid) return "Me";

    const target = familyMembers.find(m => m.uid === targetId);
    if (!target) return "Member";

    const currentUser = familyMembers.find(m => m.uid === user.uid);
    if (!currentUser) return "Member";

    const findBloodPath = (startId: string, endId: string): { up: number, down: number } | null => {
      const queue: Array<{ id: string, up: number, down: number, dir: 'up' | 'down' }> = [
        { id: startId, up: 0, down: 0, dir: 'up' }
      ];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const current = queue.shift()!;
        
        if (current.id === endId) {
          return { up: current.up, down: current.down };
        }

        if (visited.has(current.id)) continue;
        visited.add(current.id);

        const person = familyMembers.find(m => m.uid === current.id);
        if (!person?.relationships) continue;

        const parents = person.relationships.filter((r: Relationship) => r.type === 'parent').map((r: Relationship) => r.uid);
        const children = person.relationships.filter((r: Relationship) => r.type === 'child').map((r: Relationship) => r.uid);
        const siblings = person.relationships.filter((r: Relationship) => r.type === 'sibling').map((r: Relationship) => r.uid);

        if (current.dir === 'up') {
          parents.forEach((pId: string) => queue.push({ id: pId, up: current.up + 1, down: current.down, dir: 'up' }));
          siblings.forEach((sId: string) => queue.push({ id: sId, up: current.up + 1, down: current.down + 1, dir: 'down' }));
          children.forEach((cId: string) => queue.push({ id: cId, up: current.up, down: current.down + 1, dir: 'down' }));
        } else {
          children.forEach((cId: string) => queue.push({ id: cId, up: current.up, down: current.down + 1, dir: 'down' }));
        }
      }
      return null;
    };

    const getRelationshipName = (up: number, down: number): string | null => {
      if (up === 0 && down === 0) return "Me";
      if (up === 0 && down === 1) return "Child";
      if (up === 1 && down === 0) return "Parent";
      if (up === 1 && down === 1) return "Sibling";
      
      if (up === 0 && down >= 2) return `${"Great-".repeat(down - 2)}Grandchild`;
      if (up >= 2 && down === 0) return `${"Great-".repeat(up - 2)}Grandparent`;
      
      if (up === 2 && down === 1) return "Aunt/Uncle";
      if (up === 1 && down === 2) return "Niece/Nephew";
      
      if (up === 1 && down >= 3) return `${"Great-".repeat(down - 3)}Grand-Niece/Nephew`;
      if (up >= 3 && down === 1) return `${"Great-".repeat(up - 3)}Grand-Aunt/Uncle`;
      
      if (up >= 2 && down >= 2) {
        const minDist = Math.min(up, down);
        const removal = Math.abs(up - down);
        if (minDist === 2 && removal === 0) return "Cousin";
        if (minDist === 2 && removal > 0) return `Cousin ${removal}x removed`;
        const degree = minDist - 1;
        const degreeText = degree === 2 ? "Second" : degree === 3 ? "Third" : `${degree}th`;
        return removal === 0 ? `${degreeText} Cousin` : `${degreeText} Cousin ${removal}x removed`;
      }
      return null;
    };

    // 1. Check direct manually-set relationships first
    const directRel = currentUser.relationships?.find((r: Relationship) => r.uid === targetId);
    if (directRel) {
      const labels: Record<string, string> = {
        parent: 'Parent',
        child: 'Child',
        partner: 'Partner',
        sibling: 'Sibling'
      };
      return labels[directRel.type] || 'Member';
    }

    // 2. Check pure blood path 
    const bloodPath = findBloodPath(user.uid, targetId);
    if (bloodPath) {
      const name = getRelationshipName(bloodPath.up, bloodPath.down);
      if (name) return name;
    }

    // 3. In-Law & Step-Family Checks
    const myPartners = currentUser.relationships?.filter((r: Relationship) => r.type === 'partner').map((r: Relationship) => r.uid) || [];
    const targetPartners = target.relationships?.filter((r: Relationship) => r.type === 'partner').map((r: Relationship) => r.uid) || [];

    // Case 1: Target is my Partner's X
    for (const pId of myPartners) {
      const path = findBloodPath(pId, targetId);
      if (path) {
        const baseName = getRelationshipName(path.up, path.down);
        if (!baseName || baseName === 'Me') continue;
        if (baseName === 'Parent' || baseName.includes('Grandparent')) return `${baseName}-in-Law`;
        if (baseName === 'Sibling') return 'Sibling-in-Law';
        if (baseName === 'Child' || baseName.includes('Grandchild')) return `Step-${baseName}`;
        return `${baseName}-in-Law`;
      }
    }

    // Case 2: Target is my X's Partner (e.g., My Parent's Partner)
    for (const tpId of targetPartners) {
      const path = findBloodPath(user.uid, tpId);
      if (path) {
        const baseName = getRelationshipName(path.up, path.down);
        if (!baseName || baseName === 'Me') continue;
        
        // FIX: Your parent's partner is your PARENT.
        if (baseName === 'Parent') return 'Parent'; 
        if (baseName.includes('Grandparent')) return `Step-${baseName}`;
        if (baseName === 'Child' || baseName.includes('Grandchild')) return `${baseName}-in-Law`;
        if (baseName === 'Sibling') return 'Sibling-in-Law';
        return `${baseName}-in-Law`;
      }
    }

    // Case 3: Co-in-law
    for (const pId of myPartners) {
      for (const tpId of targetPartners) {
        const path = findBloodPath(pId, tpId);
        if (path) return "In-Law";
      }
    }

    return target.role || "Member";
  }, [user, familyMembers]);

  const getRelationshipLabel = useCallback((targetId: string): string => {
    return getRelationship(targetId);
  }, [getRelationship]);

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
      getRelationshipLabel,   
      googleSignIn, 
      logOut, 
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);