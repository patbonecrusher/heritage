#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import os from "os";
import { z } from "zod";

// Get the Heritage data file path from shared config
const getHeritageFilePath = () => {
  if (process.env.HERITAGE_FILE) {
    return process.env.HERITAGE_FILE;
  }
  const configPath = path.join(os.homedir(), ".heritage", "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.currentFile && fs.existsSync(config.currentFile)) {
        return config.currentFile;
      }
    } catch (e) {}
  }
  return null;
};

// Create empty heritage data structure
const createEmptyData = () => ({
  people: [],
  unions: [],
  sources: {}
});

// Load Heritage data (supports both old and new format)
const loadHeritageData = () => {
  const filePath = getHeritageFilePath();
  console.error(`loadHeritageData: filePath = ${filePath || 'null'}`);
  if (!filePath) {
    return null;
  }

  // If file doesn't exist, create it with empty data
  if (!fs.existsSync(filePath)) {
    const emptyData = createEmptyData();
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(emptyData, null, 2));
      return emptyData;
    } catch (e) {
      return null;
    }
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Detect and handle old format (has nodes array)
    if (data.nodes && !data.people) {
      return migrateOldFormat(data);
    }
    // Ensure required arrays exist
    if (!data.people) data.people = [];
    if (!data.unions) data.unions = [];
    if (!data.sources) data.sources = {};
    console.error(`loadHeritageData: returning data with ${data.people.length} people, ${data.unions.length} unions`);
    return data;
  } catch (e) {
    console.error(`loadHeritageData error: ${e.message}`);
    return null;
  }
};

// Migrate old format (nodes/edges) to new format (people/unions)
const migrateOldFormat = (data) => {
  const people = [];
  const unions = [];

  // Extract people from nodes
  (data.nodes || []).forEach(node => {
    if (node.type === 'person') {
      people.push({
        id: node.id,
        firstName: node.data.firstName || '',
        lastName: node.data.lastName || '',
        gender: node.data.gender || 'female',
        birthDate: node.data.birthDate,
        deathDate: node.data.deathDate,
        birthPlace: node.data.birthPlace || '',
        deathPlace: node.data.deathPlace || '',
        notes: node.data.notes || '',
        image: node.data.image || '',
        colorIndex: node.data.colorIndex,
        events: node.data.events || [],
        sources: node.data.sources || {}
      });
    }
  });

  // Extract unions from nodes and edges
  (data.nodes || []).forEach(node => {
    if (node.type === 'union') {
      const union = {
        id: node.id,
        partner1Id: node.data.spouse1Id || '',
        partner2Id: node.data.spouse2Id || '',
        type: node.data.unionType || 'marriage',
        startDate: node.data.startDate || node.data.marriageDate,
        startPlace: node.data.startPlace || node.data.marriagePlace || '',
        endDate: node.data.endDate || node.data.divorceDate,
        endReason: node.data.endReason || '',
        childIds: [],
        sources: node.data.sources || []
      };

      // Find children from edges
      (data.edges || []).forEach(edge => {
        if (edge.source === node.id && edge.sourceHandle === 'bottom') {
          union.childIds.push(edge.target);
        }
      });

      unions.push(union);
    }
  });

  return {
    people,
    unions,
    sources: data.sources || {}
  };
};

// Save Heritage data
const saveHeritageData = (data) => {
  const filePath = getHeritageFilePath();
  if (!filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
};

// Format a date object for display
const formatDate = (dateObj) => {
  if (!dateObj) return null;
  if (typeof dateObj === "string") return dateObj;
  if (dateObj.display) return dateObj.display;
  if (dateObj.type === "alive") return "Living";
  if (dateObj.type === "unknown") return "Unknown";
  if (dateObj.year) {
    const parts = [];
    if (dateObj.day) parts.push(dateObj.day);
    if (dateObj.month) {
      const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      parts.push(months[parseInt(dateObj.month)] || dateObj.month);
    }
    parts.push(dateObj.year);
    const prefix = dateObj.type === "circa" ? "c. " : dateObj.type === "before" ? "bef. " : dateObj.type === "after" ? "aft. " : "";
    return prefix + parts.join(" ");
  }
  return null;
};

// Parse date string to date object
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const str = dateStr.trim().toLowerCase();

  if (str === "living" || str === "alive") return { type: "alive", display: "Living" };
  if (str === "unknown" || str === "?") return { type: "unknown" };

  let type = "exact";
  let cleanStr = str;
  if (str.startsWith("c.") || str.startsWith("circa ") || str.startsWith("~")) {
    type = "circa";
    cleanStr = str.replace(/^(c\.|circa |~)\s*/, "");
  } else if (str.startsWith("bef.") || str.startsWith("before ")) {
    type = "before";
    cleanStr = str.replace(/^(bef\.|before )\s*/, "");
  } else if (str.startsWith("aft.") || str.startsWith("after ")) {
    type = "after";
    cleanStr = str.replace(/^(aft\.|after )\s*/, "");
  }

  const months = {
    jan: "1", january: "1", feb: "2", february: "2", mar: "3", march: "3",
    apr: "4", april: "4", may: "5", jun: "6", june: "6", jul: "7", july: "7",
    aug: "8", august: "8", sep: "9", september: "9", oct: "10", october: "10",
    nov: "11", november: "11", dec: "12", december: "12"
  };

  // "1 March 1920"
  let match = cleanStr.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (match && months[match[2].toLowerCase()]) {
    return { type, year: match[3], month: months[match[2].toLowerCase()], day: match[1], display: `${match[1]} ${match[2]} ${match[3]}` };
  }

  // "March 1, 1920"
  match = cleanStr.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (match && months[match[1].toLowerCase()]) {
    return { type, year: match[3], month: months[match[1].toLowerCase()], day: match[2], display: `${match[2]} ${match[1]} ${match[3]}` };
  }

  // "March 1920"
  match = cleanStr.match(/^([a-z]+)\s+(\d{4})$/i);
  if (match && months[match[1].toLowerCase()]) {
    return { type, year: match[2], month: months[match[1].toLowerCase()], display: `${match[1]} ${match[2]}` };
  }

  // "1920"
  match = cleanStr.match(/^(\d{4})$/);
  if (match) {
    const prefix = type === "circa" ? "c. " : type === "before" ? "bef. " : type === "after" ? "aft. " : "";
    return { type, year: match[1], display: prefix + match[1] };
  }

  return null;
};

// Format person for display (new format)
const formatPerson = (person, data) => {
  if (!person) return null;
  const parts = [];
  const name = [person.title, person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
  parts.push(`Name: ${name || "Unknown"}`);
  if (person.nickname) parts.push(`Nickname: "${person.nickname}"`);
  const birthStr = formatDate(person.birthDate);
  if (birthStr && birthStr !== "Unknown") parts.push(`Birth: ${birthStr}${person.birthPlace ? ` in ${person.birthPlace}` : ""}`);
  const deathStr = formatDate(person.deathDate);
  if (deathStr && deathStr !== "Unknown") parts.push(`Death: ${deathStr}${person.deathPlace ? ` in ${person.deathPlace}` : ""}`);

  // Show events
  if (person.events?.length) {
    person.events.forEach((e) => {
      const eventDate = formatDate(e.date);
      if (e.type && (eventDate || e.place)) {
        parts.push(`${e.type.charAt(0).toUpperCase() + e.type.slice(1)}: ${eventDate || ""}${e.place ? ` in ${e.place}` : ""}`);
      }
    });
  }

  // Show relationships
  if (data) {
    const unions = (data.unions || []).filter(u =>
      u.partner1Id === person.id || u.partner2Id === person.id
    );
    unions.forEach(u => {
      const spouseId = u.partner1Id === person.id ? u.partner2Id : u.partner1Id;
      const spouse = (data.people || []).find(p => p.id === spouseId);
      if (spouse) {
        const spouseName = [spouse.firstName, spouse.lastName].filter(Boolean).join(" ");
        const typeLabel = (u.type || "marriage").replace("_", " ");
        const dateStr = formatDate(u.startDate);
        parts.push(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}: ${spouseName}${dateStr ? ` (${dateStr})` : ""}`);
      }
      if (u.childIds?.length) {
        const children = u.childIds
          .map(id => (data.people || []).find(p => p.id === id))
          .filter(Boolean)
          .map(c => [c.firstName, c.lastName].filter(Boolean).join(" "));
        if (children.length) {
          parts.push(`Children: ${children.join(", ")}`);
        }
      }
    });

    // Show parents
    const parentUnion = (data.unions || []).find(u => (u.childIds || []).includes(person.id));
    if (parentUnion) {
      const parents = [parentUnion.partner1Id, parentUnion.partner2Id]
        .map(id => (data.people || []).find(p => p.id === id))
        .filter(Boolean)
        .map(p => [p.firstName, p.lastName].filter(Boolean).join(" "));
      if (parents.length) {
        parts.push(`Parents: ${parents.join(" & ")}`);
      }
    }
  }

  if (person.notes) parts.push(`Notes: ${person.notes}`);
  return parts.join("\n");
};

// Match name helper
const matchesName = (person, searchTerms) => {
  const fullName = [person.title, person.firstName, person.middleName, person.lastName, person.nickname]
    .filter(Boolean).join(" ").toLowerCase();
  return searchTerms.every(term => fullName.includes(term));
};

// Find person helper (returns person and data)
// If returnAll is true, returns { matches: [...], data } for all matches
// Otherwise returns { person, data } for single match, or null for 0 or multiple
const findPerson = (searchName, returnAll = false) => {
  const data = loadHeritageData();
  if (!data) return null;
  const searchTerms = (searchName || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return null;
  const matches = [];
  (data.people || []).forEach((p) => {
    if (matchesName(p, searchTerms)) {
      matches.push(p);
    }
  });
  if (returnAll) {
    return { matches, data };
  }
  return matches.length === 1 ? { person: matches[0], data } : null;
};

// Quebec place history
const PLACE_HISTORY = {
  "rivière-du-loup": "Formerly Fraserville until 1919. Bas-Saint-Laurent region.",
  "baie-saint-paul": "One of the oldest parishes in Charlevoix, founded 1681.",
  "québec": "Many historic parishes: Notre-Dame-de-Québec (1621), Saint-Roch, etc.",
  "montréal": "Historic parishes: Notre-Dame, Saint-Jacques, Saint-Henri, etc.",
  "charlevoix": "Region: Baie-Saint-Paul, Les Éboulements, La Malbaie, etc.",
};

// Create server
const server = new McpServer({ name: "heritage-mcp-server", version: "1.0.0" });

// Register tools using the registerTool method with Zod schemas
server.registerTool(
  "get_family_tree",
  { description: "Get an overview of everyone in the family tree" },
  async () => {
    const data = loadHeritageData();
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded." }] };
    const people = data.people || [];
    if (people.length === 0) return { content: [{ type: "text", text: "No people found." }] };

    // Group by surname
    const byName = {};
    people.forEach(p => {
      const surname = p.lastName || "Unknown";
      if (!byName[surname]) byName[surname] = [];
      byName[surname].push(p);
    });

    const lines = [`Family Tree (${people.length} people):\n`];
    Object.keys(byName).sort().forEach(surname => {
      lines.push(`\n${surname}:`);
      byName[surname].forEach(p => {
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown";
        const birthStr = formatDate(p.birthDate);
        const deathStr = formatDate(p.deathDate);
        let dateRange = "";
        if (birthStr && birthStr !== "Unknown") dateRange = `b. ${birthStr}`;
        if (deathStr && deathStr !== "Unknown" && deathStr !== "Living") dateRange += dateRange ? `, d. ${deathStr}` : `d. ${deathStr}`;
        lines.push(`  - ${name}${dateRange ? ` (${dateRange})` : ""}`);
      });
    });

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

server.registerTool(
  "get_person",
  {
    description: "Get detailed info about a specific person",
    inputSchema: { name: z.string().describe("Name of the person to find") }
  },
  async ({ name: searchName }) => {
    const data = loadHeritageData();
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded." }] };
    const searchTerms = (searchName || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) return { content: [{ type: "text", text: "Please provide a name." }] };
    const matches = (data.people || []).filter(p => matchesName(p, searchTerms));
    if (matches.length === 0) return { content: [{ type: "text", text: `No person found matching "${searchName}"` }] };
    if (matches.length === 1) return { content: [{ type: "text", text: formatPerson(matches[0], data) }] };
    const results = matches.map(p => formatPerson(p, data)).join("\n\n---\n\n");
    return { content: [{ type: "text", text: `Found ${matches.length} people:\n\n${results}` }] };
  }
);

server.registerTool(
  "search_people",
  {
    description: "Search for people by surname, given name, birth place, or birth year",
    inputSchema: {
      surname: z.string().optional().describe("Last name"),
      given_name: z.string().optional().describe("First name"),
      birth_place: z.string().optional().describe("Birth place"),
      birth_year: z.string().optional().describe("Birth year")
    }
  },
  async (args) => {
    const data = loadHeritageData();
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded." }] };
    const matches = (data.people || []).filter(p => {
      if (args.surname && !p.lastName?.toLowerCase().includes(args.surname.toLowerCase())) return false;
      if (args.given_name && !p.firstName?.toLowerCase().includes(args.given_name.toLowerCase())) return false;
      if (args.birth_place && !p.birthPlace?.toLowerCase().includes(args.birth_place.toLowerCase())) return false;
      if (args.birth_year && !formatDate(p.birthDate)?.includes(args.birth_year)) return false;
      return true;
    });
    if (matches.length === 0) return { content: [{ type: "text", text: "No matching people found." }] };
    const results = matches.map(p => formatPerson(p, data)).join("\n\n---\n\n");
    return { content: [{ type: "text", text: `Found ${matches.length} people:\n\n${results}` }] };
  }
);

server.registerTool(
  "update_person",
  {
    description: "Update a person's information (birth/death dates, places, notes)",
    inputSchema: {
      name: z.string().describe("Name of person to update"),
      birth_date: z.string().optional().describe("Birth date (e.g. '1 March 1920', 'c. 1850')"),
      birth_place: z.string().optional().describe("Birth place"),
      death_date: z.string().optional().describe("Death date (e.g. '15 June 1985', 'living')"),
      death_place: z.string().optional().describe("Death place"),
      notes: z.string().optional().describe("Notes")
    }
  },
  async (args) => {
    const result = findPerson(args.name);
    if (!result) return { content: [{ type: "text", text: `Could not find exactly one person matching "${args.name}".` }] };
    const { person, data } = result;
    const updates = [];
    if (args.birth_date) {
      const parsed = parseDate(args.birth_date);
      if (parsed) { person.birthDate = parsed; updates.push(`birth date -> ${parsed.display}`); }
    }
    if (args.birth_place) { person.birthPlace = args.birth_place; updates.push(`birth place -> ${args.birth_place}`); }
    if (args.death_date) {
      const parsed = parseDate(args.death_date);
      if (parsed) { person.deathDate = parsed; updates.push(`death date -> ${parsed.display}`); }
    }
    if (args.death_place) { person.deathPlace = args.death_place; updates.push(`death place -> ${args.death_place}`); }
    if (args.notes) { person.notes = args.notes; updates.push(`notes updated`); }
    if (updates.length === 0) return { content: [{ type: "text", text: "No updates specified." }] };
    if (!saveHeritageData(data)) return { content: [{ type: "text", text: "Failed to save." }] };
    return { content: [{ type: "text", text: `Updated ${args.name}:\n- ${updates.join("\n- ")}\n\nRefresh Heritage to see changes.` }] };
  }
);

server.registerTool(
  "add_person",
  {
    description: "Add a new person to the family tree",
    inputSchema: {
      first_name: z.string().describe("First name"),
      last_name: z.string().optional().describe("Last name"),
      gender: z.string().optional().describe("Gender: male or female"),
      birth_date: z.string().optional().describe("Birth date"),
      birth_place: z.string().optional().describe("Birth place"),
      death_date: z.string().optional().describe("Death date"),
      death_place: z.string().optional().describe("Death place"),
      notes: z.string().optional().describe("Notes")
    }
  },
  async (args) => {
    console.error(`add_person called with: ${JSON.stringify(args)}`);
    const data = loadHeritageData();
    console.error(`loadHeritageData returned: ${data ? 'data object' : 'null'}, people: ${data?.people ? 'exists' : 'undefined'}`);
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded. Check that Heritage app has a file open." }] };

    // Ensure people array exists
    if (!data.people) {
      console.error('Creating people array');
      data.people = [];
    }

    // Check for duplicate (case-insensitive, partial match for last names with "dit" names)
    const firstName = (args.first_name || "").toLowerCase().trim();
    const lastName = (args.last_name || "").toLowerCase().trim();
    const existing = data.people.find(p => {
      const pFirst = (p.firstName || "").toLowerCase().trim();
      const pLast = (p.lastName || "").toLowerCase().trim();
      // Exact first name match required
      if (pFirst !== firstName) return false;
      // For last name: exact match OR the search term is contained in existing name
      // This handles "Badaillac" matching "Badaillac dit Laplante"
      return pLast === lastName || pLast.includes(lastName) || lastName.includes(pLast);
    });

    if (existing) {
      const name = [existing.firstName, existing.lastName].filter(Boolean).join(" ");
      return { content: [{ type: "text", text: `Person "${name}" already exists in the family tree. Use update_person to modify their details, or use a different name.` }] };
    }

    const id = `person-${Date.now()}`;
    const birthDate = args.birth_date ? parseDate(args.birth_date) : { type: "unknown" };
    const deathDate = args.death_date ? parseDate(args.death_date) : { type: "unknown" };
    const gender = (args.gender || "female").toLowerCase();

    // Assign color index based on gender
    const colorIndex = gender === "male" ? 0 : gender === "female" ? 1 : 2;

    const newPerson = {
      id,
      firstName: args.first_name || "",
      lastName: args.last_name || "",
      gender,
      birthDate,
      deathDate,
      birthPlace: args.birth_place || "",
      deathPlace: args.death_place || "",
      notes: args.notes || "",
      image: "",
      colorIndex,
      events: [],
      sources: {}
    };

    data.people.push(newPerson);
    if (!saveHeritageData(data)) return { content: [{ type: "text", text: "Failed to save." }] };
    const name = [args.first_name, args.last_name].filter(Boolean).join(" ");
    return { content: [{ type: "text", text: `Added ${name}. Refresh Heritage to see.` }] };
  }
);

server.registerTool(
  "add_event",
  {
    description: "Add an event (baptism, burial, immigration, etc.) to a person",
    inputSchema: {
      person_name: z.string().describe("Name of person"),
      event_type: z.string().describe("Type: baptism, burial, immigration, emigration, etc."),
      date: z.string().optional().describe("Event date"),
      place: z.string().optional().describe("Event place")
    }
  },
  async (args) => {
    // Redirect marriage/union events to add_union tool
    const eventLower = args.event_type.toLowerCase();
    if (eventLower === "marriage" || eventLower === "wedding" || eventLower === "civil_union" || eventLower === "union") {
      return { content: [{ type: "text", text: `For marriages and unions, use the "add_union" tool instead. It creates a proper union connection between two partners.` }] };
    }

    const result = findPerson(args.person_name);
    if (!result) return { content: [{ type: "text", text: `Could not find "${args.person_name}".` }] };
    const { person, data } = result;
    if (!person.events) person.events = [];
    const event = {
      id: `event-${Date.now()}`,
      type: args.event_type.toLowerCase(),
      date: args.date ? parseDate(args.date) : null,
      place: args.place || "",
      sources: []
    };
    person.events.push(event);
    if (!saveHeritageData(data)) return { content: [{ type: "text", text: "Failed to save." }] };
    return { content: [{ type: "text", text: `Added ${args.event_type} to ${args.person_name}. Refresh Heritage to see.` }] };
  }
);

server.registerTool(
  "add_union",
  {
    description: "Create a union (marriage, civil union, common-law, etc.) between two people.",
    inputSchema: {
      spouse1_name: z.string().describe("Name of first partner"),
      spouse2_name: z.string().describe("Name of second partner"),
      union_type: z.string().optional().describe("Type: marriage, civil_union, common_law, partnership (default: marriage)"),
      start_date: z.string().optional().describe("Start date of the union"),
      start_place: z.string().optional().describe("Place where union began"),
      end_date: z.string().optional().describe("End date (if ended)"),
      end_reason: z.string().optional().describe("Reason ended: divorce, separation, annulment, death")
    }
  },
  async (args) => {
    const data = loadHeritageData();
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded." }] };

    // Helper to find person with better error messages
    const findPersonWithError = (name, role) => {
      const result = findPerson(name, true);
      if (!result || result.matches.length === 0) {
        return { error: `Could not find ${role} "${name}". Check spelling or use get_family_tree to see all people.` };
      }
      if (result.matches.length > 1) {
        const names = result.matches.map(p => [p.firstName, p.lastName].filter(Boolean).join(" ")).join(", ");
        return { error: `Found ${result.matches.length} people matching "${name}": ${names}. Please be more specific.` };
      }
      return { person: result.matches[0] };
    };

    // Find both partners
    const spouse1Result = findPersonWithError(args.spouse1_name, "partner");
    if (spouse1Result.error) return { content: [{ type: "text", text: spouse1Result.error }] };

    const spouse2Result = findPersonWithError(args.spouse2_name, "partner");
    if (spouse2Result.error) return { content: [{ type: "text", text: spouse2Result.error }] };

    const spouse1 = spouse1Result.person;
    const spouse2 = spouse2Result.person;

    const unionType = (args.union_type || "marriage").toLowerCase().replace(" ", "_");

    // Ensure unions array exists
    if (!data.unions) data.unions = [];

    // Check if union already exists between these two people
    const existingUnion = data.unions.find(u =>
      (u.partner1Id === spouse1.id && u.partner2Id === spouse2.id) ||
      (u.partner1Id === spouse2.id && u.partner2Id === spouse1.id)
    );
    if (existingUnion) {
      const typeLabel = (existingUnion.type || "union").replace("_", " ");
      return { content: [{ type: "text", text: `A ${typeLabel} already exists between these two people. Use add_child to add children to this union.` }] };
    }

    // Create union in new format (no positions, no edges)
    const unionId = `union-${Date.now()}`;
    const union = {
      id: unionId,
      partner1Id: spouse1.id,
      partner2Id: spouse2.id,
      type: unionType,
      startDate: args.start_date ? parseDate(args.start_date) : null,
      startPlace: args.start_place || "",
      endDate: args.end_date ? parseDate(args.end_date) : null,
      endReason: args.end_reason || "",
      childIds: [],
      sources: []
    };

    data.unions.push(union);

    if (!saveHeritageData(data)) return { content: [{ type: "text", text: "Failed to save." }] };

    const typeLabel = unionType.replace("_", " ");
    const dateStr = args.start_date ? ` on ${args.start_date}` : "";
    const placeStr = args.start_place ? ` in ${args.start_place}` : "";
    return { content: [{ type: "text", text: `Created ${typeLabel} between ${args.spouse1_name} and ${args.spouse2_name}${dateStr}${placeStr}.\n\nRefresh Heritage to see the union.` }] };
  }
);

server.registerTool(
  "add_child",
  {
    description: "Add a child to an existing union between two parents",
    inputSchema: {
      parent1_name: z.string().describe("Name of first parent"),
      parent2_name: z.string().describe("Name of second parent"),
      child_name: z.string().describe("Name of child to add")
    }
  },
  async (args) => {
    const data = loadHeritageData();
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded." }] };

    // Helper to find person with better error messages
    const findPersonWithError = (name, role) => {
      const result = findPerson(name, true);
      if (!result || result.matches.length === 0) {
        return { error: `Could not find ${role} "${name}". Check spelling or use get_family_tree to see all people.` };
      }
      if (result.matches.length > 1) {
        const names = result.matches.map(p => [p.firstName, p.lastName].filter(Boolean).join(" ")).join(", ");
        return { error: `Found ${result.matches.length} people matching "${name}": ${names}. Please be more specific.` };
      }
      return { person: result.matches[0] };
    };

    // Find all three people
    const parent1Result = findPersonWithError(args.parent1_name, "parent");
    if (parent1Result.error) return { content: [{ type: "text", text: parent1Result.error }] };

    const parent2Result = findPersonWithError(args.parent2_name, "parent");
    if (parent2Result.error) return { content: [{ type: "text", text: parent2Result.error }] };

    const childResult = findPersonWithError(args.child_name, "child");
    if (childResult.error) return { content: [{ type: "text", text: childResult.error }] };

    const parent1 = parent1Result.person;
    const parent2 = parent2Result.person;
    const child = childResult.person;

    // Find union between parents
    const union = (data.unions || []).find(u =>
      (u.partner1Id === parent1.id && u.partner2Id === parent2.id) ||
      (u.partner1Id === parent2.id && u.partner2Id === parent1.id)
    );

    if (!union) {
      return { content: [{ type: "text", text: `No union found between ${args.parent1_name} and ${args.parent2_name}. Create a union first with add_union.` }] };
    }

    // Add child to union
    if (!union.childIds) union.childIds = [];
    if (union.childIds.includes(child.id)) {
      return { content: [{ type: "text", text: `${args.child_name} is already a child of this union.` }] };
    }
    union.childIds.push(child.id);

    if (!saveHeritageData(data)) return { content: [{ type: "text", text: "Failed to save." }] };

    return { content: [{ type: "text", text: `Added ${args.child_name} as child of ${args.parent1_name} and ${args.parent2_name}.\n\nRefresh Heritage to see the change.` }] };
  }
);

server.registerTool(
  "get_unions",
  {
    description: "List all unions (marriages, partnerships) in the family tree",
  },
  async () => {
    const data = loadHeritageData();
    if (!data) return { content: [{ type: "text", text: "No Heritage file loaded." }] };

    const unions = data.unions || [];
    if (unions.length === 0) return { content: [{ type: "text", text: "No unions found." }] };

    const lines = [`Unions (${unions.length}):\n`];
    unions.forEach(u => {
      const p1 = (data.people || []).find(p => p.id === u.partner1Id);
      const p2 = (data.people || []).find(p => p.id === u.partner2Id);
      const name1 = p1 ? [p1.firstName, p1.lastName].filter(Boolean).join(" ") : "Unknown";
      const name2 = p2 ? [p2.firstName, p2.lastName].filter(Boolean).join(" ") : "Unknown";
      const typeLabel = (u.type || "marriage").replace("_", " ");
      const dateStr = formatDate(u.startDate);

      lines.push(`\n${name1} & ${name2}`);
      lines.push(`  Type: ${typeLabel}${dateStr ? ` (${dateStr})` : ""}`);
      if (u.startPlace) lines.push(`  Place: ${u.startPlace}`);
      if (u.childIds?.length) {
        const children = u.childIds
          .map(id => (data.people || []).find(p => p.id === id))
          .filter(Boolean)
          .map(c => [c.firstName, c.lastName].filter(Boolean).join(" "));
        lines.push(`  Children: ${children.join(", ")}`);
      }
    });

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

server.registerTool(
  "lookup_place_history",
  {
    description: "Look up Quebec historical place name info",
    inputSchema: { place_name: z.string().describe("Place name to look up") }
  },
  async ({ place_name }) => {
    const key = (place_name || "").toLowerCase().trim();
    const info = PLACE_HISTORY[key];
    if (info) return { content: [{ type: "text", text: `${place_name}: ${info}` }] };
    return { content: [{ type: "text", text: `No info for "${place_name}". Try: Charlevoix, Quebec, Montreal, etc.` }] };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.stdin.on('end', () => process.exit(0));

console.error("Heritage MCP Server running");
