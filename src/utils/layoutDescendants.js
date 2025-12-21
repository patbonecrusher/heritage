/**
 * Descendants Layout Algorithm
 *
 * Creates a top-down tree layout with:
 * - Focus person at top
 * - Spouse(s) beside
 * - Children below, recursively
 */

import {
  findPersonById,
  getUnionsForPerson,
  getSpouseId
} from './dataModel';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 150;
const UNION_WIDTH = 40;
const UNION_HEIGHT = 46;
const H_SPACING = 20;
const V_SPACING = 120;

// PersonNode spouse handles are fixed at 50px from top
const SPOUSE_HANDLE_Y = 50;

/**
 * Compute descendants layout from a person
 * Returns { nodes, edges } for React Flow
 */
export function computeDescendantsLayout(data, focusPersonId, options = {}) {
  const {
    startX = 500,
    startY = 100,
    maxDepth = 10
  } = options;

  const nodes = [];
  const edges = [];
  const positioned = new Set();

  // Calculate tree structure first to get widths
  const tree = buildDescendantTree(data, focusPersonId, positioned, 0, maxDepth);
  if (!tree) {
    return { nodes: [], edges: [] };
  }

  // Calculate widths for each node (for centering)
  calculateWidths(tree);

  // Position nodes
  positionTree(tree, startX, startY, nodes, edges, data);

  return { nodes, edges };
}

function buildDescendantTree(data, personId, visited, depth, maxDepth) {
  if (depth > maxDepth || visited.has(personId)) {
    return null;
  }

  const person = findPersonById(data, personId);
  if (!person) return null;

  visited.add(personId);

  const unions = getUnionsForPerson(data, personId);
  const tree = {
    person,
    unions: [],
    width: 0
  };

  unions.forEach(union => {
    const spouseId = getSpouseId(union, personId);
    let spouse = null;

    if (spouseId && !visited.has(spouseId)) {
      spouse = findPersonById(data, spouseId);
      if (spouse) visited.add(spouseId);
    }

    const children = [];
    (union.childIds || []).forEach(childId => {
      const childTree = buildDescendantTree(data, childId, visited, depth + 1, maxDepth);
      if (childTree) {
        children.push(childTree);
      }
    });

    tree.unions.push({
      union,
      spouse,
      children
    });
  });

  return tree;
}

function calculateWidths(tree) {
  if (!tree) return 0;

  // Base width for this person (plus any spouses)
  const spouseCount = tree.unions.filter(u => u.spouse).length;
  let baseWidth = NODE_WIDTH + spouseCount * (NODE_WIDTH + UNION_WIDTH + H_SPACING);

  // Calculate children width
  let childrenWidth = 0;
  tree.unions.forEach(u => {
    u.children.forEach(child => {
      childrenWidth += calculateWidths(child) + H_SPACING;
    });
  });

  if (childrenWidth > 0) {
    childrenWidth -= H_SPACING; // Remove last spacing
  }

  tree.width = Math.max(baseWidth, childrenWidth);
  return tree.width;
}

function positionTree(tree, centerX, y, nodes, edges, data) {
  if (!tree) return;

  const person = tree.person;

  // Position the focus person
  addPersonNode(nodes, person, centerX, y, y === 100); // isFocus if at top

  // Position unions and spouses
  let currentX = centerX;
  tree.unions.forEach((u, uIndex) => {
    const direction = uIndex % 2 === 0 ? 1 : -1;

    if (u.spouse) {
      // Layout: [Person] --[Union]-- [Spouse]
      const gap = H_SPACING;

      // Union node positioned to align with spouse handles
      const unionX = currentX + direction * (NODE_WIDTH / 2 + gap + UNION_WIDTH / 2);
      const unionHandleY = y - NODE_HEIGHT / 2 + SPOUSE_HANDLE_Y;
      addUnionNode(nodes, u.union, unionX, unionHandleY);

      // Spouse
      const spouseX = currentX + direction * (NODE_WIDTH / 2 + gap + UNION_WIDTH + gap + NODE_WIDTH / 2);
      addPersonNode(nodes, u.spouse, spouseX, y, false);

      // Edges
      edges.push(createSpouseEdge(person.id, u.union.id, direction > 0 ? 'right' : 'left'));
      edges.push(createSpouseEdge(u.spouse.id, u.union.id, direction > 0 ? 'left' : 'right'));

      // Position children below this union
      if (u.children.length > 0) {
        const childY = y + V_SPACING + NODE_HEIGHT;
        const totalChildWidth = u.children.reduce((sum, c) => sum + c.width + H_SPACING, 0) - H_SPACING;
        let childX = unionX - totalChildWidth / 2;

        u.children.forEach(child => {
          const childCenterX = childX + child.width / 2;
          positionTree(child, childCenterX, childY, nodes, edges, data);
          edges.push(createChildEdge(u.union.id, child.person.id));
          childX += child.width + H_SPACING;
        });
      }

      currentX = spouseX;
    } else {
      // No spouse, just a union node for children
      if (u.children.length > 0) {
        const unionX = centerX;
        addUnionNode(nodes, u.union, unionX, y + NODE_HEIGHT / 2 + 20);

        const childY = y + V_SPACING + NODE_HEIGHT;
        const totalChildWidth = u.children.reduce((sum, c) => sum + c.width + H_SPACING, 0) - H_SPACING;
        let childX = centerX - totalChildWidth / 2;

        u.children.forEach(child => {
          const childCenterX = childX + child.width / 2;
          positionTree(child, childCenterX, childY, nodes, edges, data);
          edges.push(createChildEdge(u.union.id, child.person.id));
          childX += child.width + H_SPACING;
        });
      }
    }
  });
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
    type: 'straight',
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
