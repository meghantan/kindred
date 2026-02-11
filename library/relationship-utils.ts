/**
 * Relationship Utilities
 * 
 * Helper functions for working with the relationships array in your family tree app.
 * Use these throughout your codebase for consistent relationship handling.
 */

export type RelationshipType = 'parent' | 'child' | 'partner' | 'sibling';

export interface Relationship {
  uid: string;
  type: RelationshipType;
  addedAt: string;
}

export interface User {
  uid: string;
  name: string;
  relationships?: Relationship[];
  [key: string]: any;
}

/**
 * Get all relationships of a specific type for a user
 */
export function getRelationshipsByType(user: User, type: RelationshipType): Relationship[] {
  return user.relationships?.filter(r => r.type === type) || [];
}

/**
 * Get all partner relationships
 */
export function getPartners(user: User, allUsers: User[]): User[] {
  const partnerRelationships = getRelationshipsByType(user, 'partner');
  return partnerRelationships
    .map(rel => allUsers.find(u => u.uid === rel.uid))
    .filter((u): u is User => u !== undefined);
}

/**
 * Get all children of a user
 */
export function getChildren(user: User, allUsers: User[]): User[] {
  const childRelationships = getRelationshipsByType(user, 'child');
  return childRelationships
    .map(rel => allUsers.find(u => u.uid === rel.uid))
    .filter((u): u is User => u !== undefined);
}

/**
 * Get all parents of a user
 */
export function getParents(user: User, allUsers: User[]): User[] {
  const parentRelationships = getRelationshipsByType(user, 'parent');
  return parentRelationships
    .map(rel => allUsers.find(u => u.uid === rel.uid))
    .filter((u): u is User => u !== undefined);
}

/**
 * Get all siblings of a user
 */
export function getSiblings(user: User, allUsers: User[]): User[] {
  const siblingRelationships = getRelationshipsByType(user, 'sibling');
  return siblingRelationships
    .map(rel => allUsers.find(u => u.uid === rel.uid))
    .filter((u): u is User => u !== undefined);
}

/**
 * Check if two users have a specific relationship
 */
export function hasRelationship(
  user: User, 
  otherUserId: string, 
  type?: RelationshipType
): boolean {
  if (!user.relationships) return false;
  
  if (type) {
    return user.relationships.some(r => r.uid === otherUserId && r.type === type);
  }
  
  return user.relationships.some(r => r.uid === otherUserId);
}

/**
 * Get the relationship type between two users (if any)
 */
export function getRelationshipType(user: User, otherUserId: string): RelationshipType | null {
  const relationship = user.relationships?.find(r => r.uid === otherUserId);
  return relationship?.type || null;
}

/**
 * Get reciprocal relationship type
 * e.g., if A is B's parent, then B is A's child
 */
export function getReciprocalType(type: RelationshipType): RelationshipType {
  const reciprocalMap: Record<RelationshipType, RelationshipType> = {
    'parent': 'child',
    'child': 'parent',
    'partner': 'partner',
    'sibling': 'sibling'
  };
  return reciprocalMap[type];
}

/**
 * Check if a user has any relationships
 */
export function hasAnyRelationships(user: User): boolean {
  return (user.relationships?.length || 0) > 0;
}

/**
 * Count relationships by type
 */
export function countRelationshipsByType(user: User): Record<RelationshipType, number> {
  const counts: Record<RelationshipType, number> = {
    parent: 0,
    child: 0,
    partner: 0,
    sibling: 0
  };
  
  user.relationships?.forEach(rel => {
    counts[rel.type]++;
  });
  
  return counts;
}

/**
 * Get all related users (regardless of type)
 */
export function getAllRelatedUsers(user: User, allUsers: User[]): User[] {
  if (!user.relationships) return [];
  
  return user.relationships
    .map(rel => allUsers.find(u => u.uid === rel.uid))
    .filter((u): u is User => u !== undefined);
}

/**
 * Build a family tree structure starting from a user
 */
export interface FamilyNode {
  user: User;
  partners: User[];
  children: FamilyNode[];
  parents: User[];
  siblings: User[];
}

export function buildFamilyTree(rootUser: User, allUsers: User[]): FamilyNode {
  const visited = new Set<string>();
  
  function buildNode(user: User): FamilyNode {
    if (visited.has(user.uid)) {
      // Prevent infinite loops
      return {
        user,
        partners: [],
        children: [],
        parents: [],
        siblings: []
      };
    }
    
    visited.add(user.uid);
    
    const partners = getPartners(user, allUsers);
    const parents = getParents(user, allUsers);
    const siblings = getSiblings(user, allUsers);
    const children = getChildren(user, allUsers);
    
    const childNodes = children.map(child => buildNode(child));
    
    return {
      user,
      partners,
      children: childNodes,
      parents,
      siblings
    };
  }
  
  return buildNode(rootUser);
}

/**
 * Find common ancestors between two users
 */
export function findCommonAncestors(userA: User, userB: User, allUsers: User[]): User[] {
  const getAncestors = (user: User, visited = new Set<string>()): Set<string> => {
    if (visited.has(user.uid)) return visited;
    visited.add(user.uid);
    
    const parents = getParents(user, allUsers);
    parents.forEach(parent => {
      getAncestors(parent, visited);
    });
    
    return visited;
  };
  
  const ancestorsA = getAncestors(userA);
  const ancestorsB = getAncestors(userB);
  
  const commonUids = Array.from(ancestorsA).filter(uid => ancestorsB.has(uid));
  
  return commonUids
    .map(uid => allUsers.find(u => u.uid === uid))
    .filter((u): u is User => u !== undefined);
}

/**
 * Calculate relationship degree (how many steps between two users)
 * Returns null if no relationship exists
 */
export function calculateRelationshipDegree(
  userA: User, 
  userB: User, 
  allUsers: User[]
): number | null {
  if (userA.uid === userB.uid) return 0;
  
  const visited = new Set<string>();
  const queue: Array<{ user: User; degree: number }> = [{ user: userA, degree: 0 }];
  
  while (queue.length > 0) {
    const { user, degree } = queue.shift()!;
    
    if (visited.has(user.uid)) continue;
    visited.add(user.uid);
    
    if (user.uid === userB.uid) return degree;
    
    const related = getAllRelatedUsers(user, allUsers);
    related.forEach(relatedUser => {
      if (!visited.has(relatedUser.uid)) {
        queue.push({ user: relatedUser, degree: degree + 1 });
      }
    });
  }
  
  return null;
}

/**
 * Validate a relationship (checks for conflicts)
 */
export interface RelationshipValidation {
  isValid: boolean;
  errors: string[];
}

export function validateRelationship(
  user: User,
  targetUserId: string,
  type: RelationshipType,
  allUsers: User[]
): RelationshipValidation {
  const errors: string[] = [];
  
  // Check if relationship already exists
  if (hasRelationship(user, targetUserId, type)) {
    errors.push(`Relationship of type "${type}" already exists with this user`);
  }
  
  // Check for conflicting relationships
  const existingType = getRelationshipType(user, targetUserId);
  if (existingType && existingType !== type) {
    errors.push(`User already has a "${existingType}" relationship with this person`);
  }
  
  // Validate partner relationships (can't be your own parent/child)
  if (type === 'partner') {
    if (hasRelationship(user, targetUserId, 'parent')) {
      errors.push('Cannot be partners with your parent');
    }
    if (hasRelationship(user, targetUserId, 'child')) {
      errors.push('Cannot be partners with your child');
    }
  }
  
  // Validate parent relationships
  if (type === 'parent') {
    const children = getChildren(user, allUsers);
    if (children.some(c => c.uid === targetUserId)) {
      errors.push('Cannot set your child as your parent');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format relationship for display
 */
export function formatRelationshipLabel(type: RelationshipType, count: number = 1): string {
  if (count === 1) {
    const labels: Record<RelationshipType, string> = {
      parent: 'Parent',
      child: 'Child',
      partner: 'Partner',
      sibling: 'Sibling'
    };
    return labels[type];
  }
  
  const pluralLabels: Record<RelationshipType, string> = {
    parent: 'Parents',
    child: 'Children',
    partner: 'Partners',
    sibling: 'Siblings'
  };
  return pluralLabels[type];
}

/**
 * Get a user's immediate family (parents, partners, children, siblings)
 */
export function getImmediateFamily(user: User, allUsers: User[]): {
  parents: User[];
  partners: User[];
  children: User[];
  siblings: User[];
} {
  return {
    parents: getParents(user, allUsers),
    partners: getPartners(user, allUsers),
    children: getChildren(user, allUsers),
    siblings: getSiblings(user, allUsers)
  };
}

/**
 * Export all utility functions as a single object
 */
export const RelationshipUtils = {
  getRelationshipsByType,
  getPartners,
  getChildren,
  getParents,
  getSiblings,
  hasRelationship,
  getRelationshipType,
  getReciprocalType,
  hasAnyRelationships,
  countRelationshipsByType,
  getAllRelatedUsers,
  buildFamilyTree,
  findCommonAncestors,
  calculateRelationshipDegree,
  validateRelationship,
  formatRelationshipLabel,
  getImmediateFamily
};

export default RelationshipUtils;