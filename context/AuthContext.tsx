'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, db } from '@/library/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

// Add proper type for Relationship
interface Relationship {
  uid: string;
  type: 'parent' | 'child' | 'partner' | 'sibling';
  addedAt: string;
}

interface AuthContextType {
  user: User | null;
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
        
        // Use onSnapshot instead of getDoc so userData syncs automatically when updated!
        const docRef = doc(db, "users", currentUser.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure relationships array exists
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
          relationships: data.relationships || [] // Ensure relationships array exists
        });
      });
      setFamilyMembers(members);
    });
    return () => unsubscribe();
  }, [userData?.familyId]);

  // 3. The "Infinite Generation" Calculator - COMPREHENSIVE VERSION!
  const getRelationship = useCallback((targetId: string): string => {
    if (!user || !familyMembers.length) return "";
    if (targetId === user.uid) return "Me";

    const target = familyMembers.find(m => m.uid === targetId);
    if (!target) return "Member";

    const currentUser = familyMembers.find(m => m.uid === user.uid);
    if (!currentUser) return "Member";

    // --- HELPER FUNCTIONS ---
    
    // Get all relationships of a specific type for a person
    const getRelationshipsOfType = (personId: string, type: 'parent' | 'child' | 'partner' | 'sibling'): string[] => {
      const person = familyMembers.find(m => m.uid === personId);
      if (!person?.relationships) return [];
      return person.relationships
        .filter((r: Relationship) => r.type === type)
        .map((r: Relationship) => r.uid);
    };

    // Get all ancestors (parents, grandparents, etc.) with their distance
    const getAncestors = (personId: string): Map<string, number> => {
      const ancestors = new Map<string, number>();
      const queue: Array<{id: string, dist: number}> = [{id: personId, dist: 0}];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const {id, dist} = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        
        if (dist > 0) ancestors.set(id, dist);
        
        const parents = getRelationshipsOfType(id, 'parent');
        parents.forEach(parentId => {
          queue.push({id: parentId, dist: dist + 1});
        });
      }
      
      return ancestors;
    };

    // Get all descendants (children, grandchildren, etc.) with their distance
    const getDescendants = (personId: string): Map<string, number> => {
      const descendants = new Map<string, number>();
      const queue: Array<{id: string, dist: number}> = [{id: personId, dist: 0}];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const {id, dist} = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        
        if (dist > 0) descendants.set(id, dist);
        
        const children = getRelationshipsOfType(id, 'child');
        children.forEach(childId => {
          queue.push({id: childId, dist: dist + 1});
        });
      }
      
      return descendants;
    };

    // Find lowest common ancestor and return distances
    const findCommonAncestor = (person1Id: string, person2Id: string): {ancestor: string, dist1: number, dist2: number} | null => {
      const ancestors1 = getAncestors(person1Id);
      const ancestors2 = getAncestors(person2Id);
      
      // Check if one is ancestor of the other
      if (ancestors1.has(person2Id)) {
        return {ancestor: person2Id, dist1: ancestors1.get(person2Id)!, dist2: 0};
      }
      if (ancestors2.has(person1Id)) {
        return {ancestor: person1Id, dist1: 0, dist2: ancestors2.get(person1Id)!};
      }
      
      // Find common ancestors
      for (const [ancestor, dist1] of ancestors1.entries()) {
        if (ancestors2.has(ancestor)) {
          return {ancestor, dist1, dist2: ancestors2.get(ancestor)!};
        }
      }
      
      return null;
    };

    // Generate relationship name from distances
    const getRelationshipName = (up: number, down: number): string | null => {
      if (up === 0 && down === 0) return "Me";
      if (up === 0 && down === 1) return "Child";
      if (up === 1 && down === 0) return "Parent";
      if (up === 1 && down === 1) return "Sibling";
      
      // Direct descendants
      if (up === 0 && down >= 2) {
        const greats = "Great-".repeat(down - 2);
        return `${greats}Grandchild`;
      }
      
      // Direct ancestors
      if (up >= 2 && down === 0) {
        const greats = "Great-".repeat(up - 2);
        return `${greats}Grandparent`;
      }
      
      // Aunts/Uncles and Nieces/Nephews
      if (up === 2 && down === 1) return "Aunt/Uncle";
      if (up === 1 && down === 2) return "Niece/Nephew";
      
      // Grand nieces/nephews (niblings!)
      if (up === 1 && down >= 3) {
        const greats = "Great-".repeat(down - 3);
        return `${greats}Grand-Niece/Nephew`;
      }
      
      // Great aunts/uncles
      if (up >= 3 && down === 1) {
        const greats = "Great-".repeat(up - 3);
        return `${greats}Grand-Aunt/Uncle`;
      }
      
      // Cousins
      if (up >= 2 && down >= 2) {
        const minDist = Math.min(up, down);
        const removal = Math.abs(up - down);
        
        if (minDist === 2 && removal === 0) return "Cousin";
        if (minDist === 2 && removal > 0) return `Cousin ${removal}x removed`;
        
        const degree = minDist - 1;
        const degreeText = degree === 2 ? "Second" : degree === 3 ? "Third" : `${degree}th`;
        
        if (removal === 0) return `${degreeText} Cousin`;
        return `${degreeText} Cousin ${removal}x removed`;
      }
      
      return null;
    };

    // --- MAIN LOGIC ---
    
    // 1. Check direct relationships (partner, parent, child, sibling)
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

    // 2. Check blood relationships (ancestors/descendants/cousins)
    const commonAncestor = findCommonAncestor(user.uid, targetId);
    if (commonAncestor) {
      const name = getRelationshipName(commonAncestor.dist1, commonAncestor.dist2);
      if (name) return name;
    }

    // 3. Check in-law relationships through MY partner
    const myPartners = getRelationshipsOfType(user.uid, 'partner');
    for (const partnerId of myPartners) {
      // Partner's blood relatives are my in-laws
      const partnerCommonAncestor = findCommonAncestor(partnerId, targetId);
      if (partnerCommonAncestor) {
        const baseName = getRelationshipName(partnerCommonAncestor.dist1, partnerCommonAncestor.dist2);
        if (baseName && baseName !== 'Me') {
          // Special handling for parent/child in-laws
          if (baseName === 'Parent') return 'Parent-in-Law';
          if (baseName === 'Child') return 'Child-in-Law';
          if (baseName === 'Sibling') return 'Sibling-in-Law';
          return `${baseName}-in-Law`;
        }
      }
      
      // Check if target is my partner's partner (shouldn't happen but handle it)
      if (partnerId === targetId) return 'Partner';
    }

    // 4. Check in-law relationships through TARGET's partner
    const targetPartners = getRelationshipsOfType(targetId, 'partner');
    for (const targetPartnerId of targetPartners) {
      // If target's partner is my blood relative
      const myCommonAncestor = findCommonAncestor(user.uid, targetPartnerId);
      if (myCommonAncestor) {
        const baseName = getRelationshipName(myCommonAncestor.dist1, myCommonAncestor.dist2);
        if (baseName && baseName !== 'Me') {
          if (baseName === 'Parent') return 'Parent-in-Law';
          if (baseName === 'Child') return 'Child-in-Law';
          if (baseName === 'Sibling') return 'Sibling-in-Law';
          return `${baseName}-in-Law`;
        }
      }
    }

    // 5. Check extended in-law relationships (in-laws of in-laws)
    // Example: My child's spouse's parent = Co-Parent-in-Law (simplified to "In-Law")
    for (const myPartnerId of myPartners) {
      // Get my partner's relatives
      const myPartnerDescendants = getDescendants(myPartnerId);
      const myPartnerAncestors = getAncestors(myPartnerId);
      
      // Check if target is related to any of my partner's relatives' partners
      for (const [relativeId] of [...myPartnerDescendants, ...myPartnerAncestors]) {
        const relativePartners = getRelationshipsOfType(relativeId, 'partner');
        for (const relativePartnerId of relativePartners) {
          const distToPartner = findCommonAncestor(relativePartnerId, targetId);
          if (distToPartner) {
            // This person is related to my partner's relative's partner
            return 'In-Law';
          }
        }
      }
    }

    // 6. Check if target is related to MY relatives' partners
    const myDescendants = getDescendants(user.uid);
    const myAncestors = getAncestors(user.uid);
    
    for (const [myRelativeId] of [...myDescendants, ...myAncestors]) {
      const myRelativePartners = getRelationshipsOfType(myRelativeId, 'partner');
      for (const partnerOfMyRelative of myRelativePartners) {
        // Check if target is related to this partner
        const distToTargetFromPartner = findCommonAncestor(partnerOfMyRelative, targetId);
        if (distToTargetFromPartner) {
          // Target is related to my relative's partner (extended in-law)
          return 'In-Law';
        }
      }
    }

    // 7. No relationship found
    return target.role || "Member";
  }, [user, familyMembers]);

  // Helper function to get the DISPLAY label (reciprocal of the relationship)
  // This is what should be shown on cards/lists to indicate "their relationship to me"
  const getRelationshipLabel = useCallback((targetId: string): string => {
    const relationship = getRelationship(targetId);
    
    // Get reciprocal for display
    const getReciprocal = (rel: string): string => {
      // Direct relationships
      if (rel === "Child") return "Parent";
      if (rel === "Parent") return "Child";
      if (rel === "Partner") return "Partner";
      if (rel === "Sibling") return "Sibling";
      if (rel === "Me") return "You";
      
      // In-law relationships
      if (rel === "Parent-in-Law") return "Child-in-Law";
      if (rel === "Child-in-Law") return "Parent-in-Law";
      if (rel === "Sibling-in-Law") return "Sibling-in-Law";
      if (rel === "In-Law") return "In-Law";
      
      // Grandparents/Grandchildren
      if (rel === "Grandparent") return "Grandchild";
      if (rel === "Grandchild") return "Grandparent";
      if (rel.includes("Great-") && rel.includes("Grandparent")) {
        return rel.replace("Grandparent", "Grandchild");
      }
      if (rel.includes("Great-") && rel.includes("Grandchild")) {
        return rel.replace("Grandchild", "Grandparent");
      }
      
      // Aunts/Uncles and Nieces/Nephews
      if (rel === "Aunt/Uncle") return "Niece/Nephew";
      if (rel === "Niece/Nephew") return "Aunt/Uncle";
      if (rel.includes("Grand-Aunt/Uncle") || rel.includes("Great-Grand-Aunt/Uncle")) {
        return rel.replace("Aunt/Uncle", "Niece/Nephew");
      }
      if (rel.includes("Grand-Niece/Nephew") || rel.includes("Great-Grand-Niece/Nephew")) {
        return rel.replace("Niece/Nephew", "Aunt/Uncle");
      }
      
      // Cousins are reciprocal (Cousin = Cousin)
      if (rel.includes("Cousin")) return rel;
      
      // Complex in-laws
      if (rel.includes("-in-Law")) return rel;
      
      // Default
      return rel;
    };
    
    return getReciprocal(relationship);
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