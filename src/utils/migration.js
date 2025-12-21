/**
 * Heritage Data Migration
 *
 * Converts between old format (React Flow nodes/edges with positions)
 * and new format (database-like with people/unions/sources).
 */

import { isNewFormat, isOldFormat, createPerson, createUnion } from './dataModel';

/**
 * Migrate old format to new format
 */
export function migrateToNewFormat(oldData) {
  if (isNewFormat(oldData)) {
    return oldData; // Already in new format
  }

  if (!isOldFormat(oldData)) {
    // Unknown format, return empty structure
    return { people: [], unions: [], sources: oldData?.sources || {} };
  }

  const nodes = oldData.nodes || [];
  const edges = oldData.edges || [];

  // Extract people from person nodes
  const people = nodes
    .filter(n => n.type === 'person')
    .map(n => createPerson({
      id: n.id,
      ...n.data,
      // Map old field names to new
      notes: n.data.notes || n.data.description || ''
    }));

  // Extract unions from union nodes
  const unionNodes = nodes.filter(n => n.type === 'union');
  const unions = unionNodes.map(n => createUnion({
    id: n.id,
    partner1Id: n.data.spouse1Id,
    partner2Id: n.data.spouse2Id,
    type: n.data.unionType || 'marriage',
    startDate: n.data.startDate || n.data.marriageDate,
    startPlace: n.data.startPlace || n.data.marriagePlace || '',
    endDate: n.data.endDate || n.data.divorceDate,
    endReason: n.data.endReason || '',
    childIds: [], // Will be populated from edges
    sources: n.data.unionSources || n.data.marriageSources || []
  }));

  // Build union ID map for quick lookup
  const unionMap = new Map(unions.map(u => [u.id, u]));

  // Find children from edges (union bottom -> person top)
  edges.forEach(edge => {
    // Check if source is a union and target is a person
    const sourceUnion = unionMap.get(edge.source);
    const targetPerson = people.find(p => p.id === edge.target);

    if (sourceUnion && targetPerson) {
      // This edge connects union to child
      if (edge.sourceHandle === 'bottom' || !edge.sourceHandle) {
        if (!sourceUnion.childIds.includes(edge.target)) {
          sourceUnion.childIds.push(edge.target);
        }
      }
    }
  });

  // Also check for direct parent-child edges (person -> person)
  // These might exist in files without union nodes
  edges.forEach(edge => {
    const sourcePerson = people.find(p => p.id === edge.source);
    const targetPerson = people.find(p => p.id === edge.target);

    if (sourcePerson && targetPerson) {
      // Direct person-to-person edge (likely parent to child)
      if (edge.sourceHandle === 'bottom' && edge.targetHandle === 'top') {
        // This is a direct parent-child link without a union
        // We can't automatically create unions for these without more info
        // Just note this for now - the user may need to reconnect via unions
        console.log(`Direct parent-child edge found: ${sourcePerson.firstName} -> ${targetPerson.firstName}`);
      }
    }
  });

  return {
    people,
    unions,
    sources: oldData.sources || {}
  };
}

/**
 * Convert new format to old format (for React Flow rendering)
 * Positions are computed, not stored.
 */
export function convertToReactFlow(newData, layout = 'auto') {
  if (!isNewFormat(newData)) {
    // If already in old format, return as-is but strip positions
    if (isOldFormat(newData)) {
      return newData;
    }
    return { nodes: [], edges: [], sources: {} };
  }

  const people = newData.people || [];
  const unions = newData.unions || [];

  // Compute positions based on layout algorithm
  const positions = computePositions(newData, layout);

  // Create person nodes
  const personNodes = people.map(person => ({
    id: person.id,
    type: 'person',
    position: positions[person.id] || { x: 100, y: 100 },
    data: {
      ...person,
      name: [person.firstName, person.lastName].filter(Boolean).join(' '),
      dates: formatDatesString(person),
      description: person.notes
    }
  }));

  // Create union nodes
  const unionNodes = unions.map(union => ({
    id: union.id,
    type: 'union',
    position: positions[union.id] || { x: 200, y: 150 },
    data: {
      unionType: union.type,
      startDate: union.startDate,
      startPlace: union.startPlace,
      endDate: union.endDate,
      endReason: union.endReason,
      spouse1Id: union.partner1Id,
      spouse2Id: union.partner2Id,
      unionSources: union.sources,
      // Legacy field names for backwards compatibility
      marriageDate: union.startDate,
      marriagePlace: union.startPlace,
      divorceDate: union.endDate,
      marriageSources: union.sources
    }
  }));

  // Create edges
  const edges = [];

  // Spouse edges (person -> union)
  unions.forEach(union => {
    if (union.partner1Id) {
      edges.push({
        id: `spouse-${union.partner1Id}-${union.id}`,
        source: union.partner1Id,
        target: union.id,
        sourceHandle: 'spouse-right',
        targetHandle: 'left',
        type: 'smoothstep',
        className: 'spouse-edge'
      });
    }
    if (union.partner2Id) {
      edges.push({
        id: `spouse-${union.partner2Id}-${union.id}`,
        source: union.partner2Id,
        target: union.id,
        sourceHandle: 'spouse-left',
        targetHandle: 'right',
        type: 'smoothstep',
        className: 'spouse-edge'
      });
    }

    // Child edges (union -> child)
    (union.childIds || []).forEach(childId => {
      edges.push({
        id: `child-${union.id}-${childId}`,
        source: union.id,
        target: childId,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        markerEnd: { type: 'ArrowClosed' }
      });
    });
  });

  return {
    nodes: [...personNodes, ...unionNodes],
    edges,
    sources: newData.sources || {}
  };
}

/**
 * Compute positions for all nodes
 * Basic auto-layout algorithm
 */
function computePositions(data, layout) {
  const positions = {};
  const people = data.people || [];
  const unions = data.unions || [];

  if (layout === 'auto' || layout === 'grid') {
    // Simple grid layout for now
    const nodeWidth = 200;
    const nodeHeight = 180;
    const cols = Math.ceil(Math.sqrt(people.length));

    people.forEach((person, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      positions[person.id] = {
        x: 100 + col * (nodeWidth + 50),
        y: 100 + row * (nodeHeight + 80)
      };
    });

    // Position unions between their partners
    unions.forEach(union => {
      const p1Pos = positions[union.partner1Id] || { x: 200, y: 100 };
      const p2Pos = positions[union.partner2Id] || { x: 400, y: 100 };
      positions[union.id] = {
        x: (p1Pos.x + p2Pos.x) / 2,
        y: Math.max(p1Pos.y, p2Pos.y) + 20
      };
    });
  }

  return positions;
}

/**
 * Format birth/death dates as string for display
 */
function formatDatesString(person) {
  const parts = [];

  const birthYear = formatYear(person.birthDate);
  const deathYear = formatYear(person.deathDate);

  if (birthYear) parts.push(birthYear);
  if (deathYear && deathYear !== 'Living') {
    parts.push('-');
    parts.push(deathYear);
  } else if (person.deathDate?.type === 'alive') {
    // Living person, just show birth year
  } else if (birthYear && !deathYear) {
    // Birth year only, might still be alive or unknown death
    parts.push('-');
  }

  return parts.join(' ').trim() || '';
}

function formatYear(dateObj) {
  if (!dateObj) return '';
  if (dateObj.type === 'alive') return 'Living';
  if (dateObj.type === 'unknown') return '';
  if (dateObj.display) {
    // Extract just the year from display
    const match = dateObj.display.match(/\d{4}/);
    return match ? match[0] : dateObj.display;
  }
  return dateObj.year || '';
}

/**
 * Detect data format version
 */
export function detectFormat(data) {
  if (isNewFormat(data)) return 'new';
  if (isOldFormat(data)) return 'old';
  return 'unknown';
}
