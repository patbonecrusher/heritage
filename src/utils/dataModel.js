/**
 * Heritage Data Model
 *
 * New database-like structure without positions.
 * Positions are computed on-the-fly based on relationships.
 */

// Check if data is in the new format
export function isNewFormat(data) {
  return data && Array.isArray(data.people) && Array.isArray(data.unions);
}

// Check if data is in the old format (React Flow nodes/edges)
export function isOldFormat(data) {
  return data && Array.isArray(data.nodes) && Array.isArray(data.edges);
}

// Get all people from data (works with both formats)
export function getPeople(data) {
  if (isNewFormat(data)) {
    return data.people || [];
  }
  if (isOldFormat(data)) {
    return (data.nodes || []).filter(n => n.type === 'person').map(n => ({
      id: n.id,
      ...n.data
    }));
  }
  return [];
}

// Get all unions from data (works with both formats)
export function getUnions(data) {
  if (isNewFormat(data)) {
    return data.unions || [];
  }
  if (isOldFormat(data)) {
    return (data.nodes || []).filter(n => n.type === 'union').map(n => ({
      id: n.id,
      partner1Id: n.data.spouse1Id,
      partner2Id: n.data.spouse2Id,
      type: n.data.unionType || 'marriage',
      startDate: n.data.startDate || n.data.marriageDate,
      startPlace: n.data.startPlace || n.data.marriagePlace || '',
      endDate: n.data.endDate || n.data.divorceDate,
      endReason: n.data.endReason || '',
      childIds: [], // Will be populated by migration
      sources: n.data.unionSources || n.data.marriageSources || []
    }));
  }
  return [];
}

// Get sources from data
export function getSources(data) {
  return data?.sources || {};
}

// Find a person by ID
export function findPersonById(data, id) {
  const people = getPeople(data);
  return people.find(p => p.id === id);
}

// Find a person by name (partial match)
export function findPersonByName(data, searchName) {
  const people = getPeople(data);
  const searchTerms = (searchName || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return null;

  const matches = people.filter(p => {
    const fullName = [p.title, p.firstName, p.middleName, p.lastName, p.nickname]
      .filter(Boolean).join(' ').toLowerCase();
    return searchTerms.every(term => fullName.includes(term));
  });

  return matches.length === 1 ? matches[0] : null;
}

// Get unions for a person
export function getUnionsForPerson(data, personId) {
  const unions = getUnions(data);
  return unions.filter(u => u.partner1Id === personId || u.partner2Id === personId);
}

// Get spouse from a union
export function getSpouseId(union, personId) {
  if (union.partner1Id === personId) return union.partner2Id;
  if (union.partner2Id === personId) return union.partner1Id;
  return null;
}

// Get children of a person (from all unions)
export function getChildrenIds(data, personId) {
  const unions = getUnionsForPerson(data, personId);
  const childIds = new Set();
  unions.forEach(u => {
    (u.childIds || []).forEach(id => childIds.add(id));
  });
  return Array.from(childIds);
}

// Get parents of a person
export function getParentIds(data, personId) {
  const unions = getUnions(data);
  for (const union of unions) {
    if ((union.childIds || []).includes(personId)) {
      return [union.partner1Id, union.partner2Id].filter(Boolean);
    }
  }
  return [];
}

// Get siblings of a person (same parents)
export function getSiblingIds(data, personId) {
  const unions = getUnions(data);
  const siblingIds = new Set();

  for (const union of unions) {
    if ((union.childIds || []).includes(personId)) {
      (union.childIds || []).forEach(id => {
        if (id !== personId) siblingIds.add(id);
      });
    }
  }

  return Array.from(siblingIds);
}

// Group people by surname
export function groupBySurname(data) {
  const people = getPeople(data);
  const groups = {};

  people.forEach(person => {
    const surname = (person.lastName || 'Unknown').trim() || 'Unknown';
    if (!groups[surname]) {
      groups[surname] = [];
    }
    groups[surname].push(person);
  });

  // Sort each group by first name
  Object.keys(groups).forEach(surname => {
    groups[surname].sort((a, b) => {
      const nameA = (a.firstName || '').toLowerCase();
      const nameB = (b.firstName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  // Return sorted by surname
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .map(surname => ({
      surname,
      people: groups[surname]
    }));
}

// Create a new person object
export function createPerson(data = {}) {
  return {
    id: data.id || String(Date.now()),
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    middleName: data.middleName || '',
    maidenName: data.maidenName || '',
    nickname: data.nickname || '',
    title: data.title || '',
    gender: data.gender || 'female',
    birthDate: data.birthDate || { type: 'unknown' },
    deathDate: data.deathDate || { type: 'unknown' },
    birthPlace: data.birthPlace || '',
    deathPlace: data.deathPlace || '',
    notes: data.notes || data.description || '',
    image: data.image || '',
    events: data.events || [],
    colorIndex: data.colorIndex,
    // Source references
    birthSources: data.birthSources || [],
    deathSources: data.deathSources || []
  };
}

// Create a new union object
export function createUnion(data = {}) {
  return {
    id: data.id || `union-${Date.now()}`,
    partner1Id: data.partner1Id || '',
    partner2Id: data.partner2Id || '',
    type: data.type || 'marriage',
    startDate: data.startDate || null,
    startPlace: data.startPlace || '',
    endDate: data.endDate || null,
    endReason: data.endReason || '',
    childIds: data.childIds || [],
    sources: data.sources || []
  };
}

// Create empty data structure
export function createEmptyData() {
  return {
    people: [],
    unions: [],
    sources: {}
  };
}

// Add a person to data
export function addPerson(data, person) {
  const newPerson = createPerson(person);
  return {
    ...data,
    people: [...(data.people || []), newPerson]
  };
}

// Update a person in data
export function updatePerson(data, personId, updates) {
  return {
    ...data,
    people: (data.people || []).map(p =>
      p.id === personId ? { ...p, ...updates } : p
    )
  };
}

// Remove a person from data (also removes from unions)
export function removePerson(data, personId) {
  return {
    ...data,
    people: (data.people || []).filter(p => p.id !== personId),
    unions: (data.unions || []).map(u => ({
      ...u,
      childIds: (u.childIds || []).filter(id => id !== personId)
    })).filter(u => u.partner1Id !== personId && u.partner2Id !== personId)
  };
}

// Add a union to data
export function addUnion(data, union) {
  const newUnion = createUnion(union);
  return {
    ...data,
    unions: [...(data.unions || []), newUnion]
  };
}

// Update a union in data
export function updateUnion(data, unionId, updates) {
  return {
    ...data,
    unions: (data.unions || []).map(u =>
      u.id === unionId ? { ...u, ...updates } : u
    )
  };
}

// Add a child to a union
export function addChildToUnion(data, unionId, childId) {
  return {
    ...data,
    unions: (data.unions || []).map(u =>
      u.id === unionId
        ? { ...u, childIds: [...(u.childIds || []), childId] }
        : u
    )
  };
}

// Remove a union from data
export function removeUnion(data, unionId) {
  return {
    ...data,
    unions: (data.unions || []).filter(u => u.id !== unionId)
  };
}
