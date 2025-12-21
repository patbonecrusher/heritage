/**
 * Pedigree Layout Algorithm
 *
 * Creates a centered layout with:
 * - Focus person in the middle
 * - Parents above (with their parents above them)
 * - Spouse(s) beside
 * - Children below
 */

import {
  findPersonById,
  getUnionsForPerson,
  getSpouseId,
  getParentIds,
  getChildrenIds
} from './dataModel';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 160;
const UNION_WIDTH = 40;
const UNION_HEIGHT = 40;
const H_SPACING = 60;  // Horizontal spacing between nodes
const V_SPACING = 100; // Vertical spacing between generations

/**
 * Compute pedigree layout centered on a person
 * Returns { nodes, edges } for React Flow
 */
export function computePedigreeLayout(data, focusPersonId, options = {}) {
  const {
    showGrandparents = true,
    showChildren = true,
    centerX = 400,
    centerY = 300
  } = options;

  const nodes = [];
  const edges = [];
  const positioned = new Set();

  const focusPerson = findPersonById(data, focusPersonId);
  if (!focusPerson) {
    return { nodes: [], edges: [] };
  }

  // Position focus person at center
  addPersonNode(nodes, focusPerson, centerX, centerY, true);
  positioned.add(focusPerson.id);

  // Get unions for focus person
  const focusUnions = getUnionsForPerson(data, focusPersonId);

  // Position spouse(s) and union nodes
  let spouseOffset = 0;
  focusUnions.forEach((union, index) => {
    const spouseId = getSpouseId(union, focusPersonId);
    if (spouseId && !positioned.has(spouseId)) {
      const spouse = findPersonById(data, spouseId);
      if (spouse) {
        // Alternate left/right for multiple spouses
        const direction = index % 2 === 0 ? 1 : -1;
        const spouseX = centerX + direction * (NODE_WIDTH + H_SPACING + UNION_WIDTH);

        // Union node between them
        const unionX = centerX + direction * (NODE_WIDTH / 2 + H_SPACING / 2);
        addUnionNode(nodes, union, unionX, centerY);

        // Spouse node
        addPersonNode(nodes, spouse, spouseX, centerY, false);
        positioned.add(spouse.id);

        // Edges: focus -> union -> spouse
        edges.push(createSpouseEdge(focusPersonId, union.id, direction > 0 ? 'right' : 'left'));
        edges.push(createSpouseEdge(spouseId, union.id, direction > 0 ? 'left' : 'right'));

        spouseOffset = direction * (NODE_WIDTH + H_SPACING + UNION_WIDTH);
      }
    }
  });

  // Position parents above
  const parentIds = getParentIds(data, focusPersonId);
  if (parentIds.length > 0) {
    const parentY = centerY - V_SPACING - NODE_HEIGHT / 2;
    const parentSpacing = NODE_WIDTH + H_SPACING;
    const parentStartX = centerX - (parentIds.length - 1) * parentSpacing / 2;

    // Find the union that connects the parents
    const parentUnion = (data.unions || []).find(u =>
      (u.childIds || []).includes(focusPersonId)
    );

    parentIds.forEach((parentId, index) => {
      if (!positioned.has(parentId)) {
        const parent = findPersonById(data, parentId);
        if (parent) {
          const parentX = parentStartX + index * parentSpacing;
          addPersonNode(nodes, parent, parentX, parentY, false);
          positioned.add(parentId);
        }
      }
    });

    // Add parent union node if exists
    if (parentUnion && parentIds.length === 2) {
      const unionX = parentStartX + parentSpacing / 2;
      const unionY = parentY + NODE_HEIGHT / 2 + 20;
      addUnionNode(nodes, parentUnion, unionX, unionY);

      // Edges: parent1 -> union <- parent2 -> child
      edges.push(createSpouseEdge(parentIds[0], parentUnion.id, 'right'));
      edges.push(createSpouseEdge(parentIds[1], parentUnion.id, 'left'));
      edges.push(createChildEdge(parentUnion.id, focusPersonId));
    }

    // Position grandparents if enabled
    if (showGrandparents) {
      parentIds.forEach((parentId, pIndex) => {
        const parent = findPersonById(data, parentId);
        if (!parent) return;

        const grandparentIds = getParentIds(data, parentId);
        if (grandparentIds.length === 0) return;

        const gpY = parentY - V_SPACING - NODE_HEIGHT / 2;
        const gpSpacing = NODE_WIDTH / 2 + H_SPACING / 2;
        const parentX = parentStartX + pIndex * (NODE_WIDTH + H_SPACING);
        const gpStartX = parentX - gpSpacing / 2;

        grandparentIds.forEach((gpId, gpIndex) => {
          if (!positioned.has(gpId)) {
            const gp = findPersonById(data, gpId);
            if (gp) {
              const gpX = gpStartX + gpIndex * gpSpacing;
              addPersonNode(nodes, gp, gpX, gpY, false);
              positioned.add(gpId);
            }
          }
        });

        // Find grandparent union
        const gpUnion = (data.unions || []).find(u =>
          (u.childIds || []).includes(parentId)
        );

        if (gpUnion && grandparentIds.length === 2) {
          const unionX = gpStartX + gpSpacing / 2;
          const unionY = gpY + NODE_HEIGHT / 2 + 20;
          addUnionNode(nodes, gpUnion, unionX, unionY);

          edges.push(createSpouseEdge(grandparentIds[0], gpUnion.id, 'right'));
          edges.push(createSpouseEdge(grandparentIds[1], gpUnion.id, 'left'));
          edges.push(createChildEdge(gpUnion.id, parentId));
        }
      });
    }
  }

  // Position children below
  if (showChildren) {
    focusUnions.forEach(union => {
      const childIds = union.childIds || [];
      if (childIds.length === 0) return;

      const childY = centerY + V_SPACING + NODE_HEIGHT / 2;
      const childSpacing = NODE_WIDTH + H_SPACING;
      const childStartX = centerX - (childIds.length - 1) * childSpacing / 2;

      childIds.forEach((childId, index) => {
        if (!positioned.has(childId)) {
          const child = findPersonById(data, childId);
          if (child) {
            const childX = childStartX + index * childSpacing;
            addPersonNode(nodes, child, childX, childY, false);
            positioned.add(childId);

            edges.push(createChildEdge(union.id, childId));
          }
        }
      });
    });
  }

  return { nodes, edges };
}

function addPersonNode(nodes, person, x, y, isFocus) {
  nodes.push({
    id: person.id,
    type: 'person',
    position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    data: {
      ...person,
      name: [person.firstName, person.lastName].filter(Boolean).join(' '),
      dates: formatDates(person),
      description: person.notes,
      isFocus
    }
  });
}

function addUnionNode(nodes, union, x, y) {
  nodes.push({
    id: union.id,
    type: 'union',
    position: { x: x - UNION_WIDTH / 2, y: y - UNION_HEIGHT / 2 },
    data: {
      unionType: union.type,
      startDate: union.startDate,
      startPlace: union.startPlace,
      endDate: union.endDate,
      endReason: union.endReason,
      spouse1Id: union.partner1Id,
      spouse2Id: union.partner2Id,
      // Legacy fields
      marriageDate: union.startDate,
      marriagePlace: union.startPlace
    }
  });
}

function createSpouseEdge(personId, unionId, side) {
  return {
    id: `spouse-${personId}-${unionId}`,
    source: personId,
    target: unionId,
    sourceHandle: side === 'right' ? 'spouse-right' : 'spouse-left',
    targetHandle: side === 'right' ? 'left' : 'right',
    type: 'smoothstep',
    className: 'spouse-edge'
  };
}

function createChildEdge(unionId, childId) {
  return {
    id: `child-${unionId}-${childId}`,
    source: unionId,
    target: childId,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'smoothstep',
    markerEnd: { type: 'ArrowClosed' }
  };
}

function formatDates(person) {
  const birth = person.birthDate;
  const death = person.deathDate;

  let birthYear = '';
  let deathYear = '';

  if (birth?.year) birthYear = birth.year;
  else if (birth?.display) {
    const match = birth.display.match(/\d{4}/);
    if (match) birthYear = match[0];
  }

  if (death?.type === 'alive') {
    return birthYear ? `${birthYear} -` : '';
  }

  if (death?.year) deathYear = death.year;
  else if (death?.display) {
    const match = death.display.match(/\d{4}/);
    if (match) deathYear = match[0];
  }

  if (birthYear && deathYear) return `${birthYear} - ${deathYear}`;
  if (birthYear) return `${birthYear} -`;
  if (deathYear) return `- ${deathYear}`;
  return '';
}
