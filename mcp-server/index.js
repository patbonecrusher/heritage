#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import os from "os";

// Get the Heritage data file path from environment or default location
const getHeritageFilePath = () => {
  if (process.env.HERITAGE_FILE) {
    return process.env.HERITAGE_FILE;
  }
  // Try to read from Heritage's last-file storage
  const configPath = path.join(os.homedir(), "Library", "Application Support", "heritage", "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.lastFile) return config.lastFile;
    } catch (e) {
      // ignore
    }
  }
  return null;
};

// Load Heritage data
const loadHeritageData = () => {
  const filePath = getHeritageFilePath();
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return null;
  }
};

// Format a person for display
const formatPerson = (node) => {
  if (!node || node.type !== "person") return null;
  const d = node.data;
  const parts = [];

  const name = [d.title, d.firstName, d.middleName, d.lastName].filter(Boolean).join(" ");
  parts.push(`Name: ${name || "Unknown"}`);
  if (d.nickname) parts.push(`Nickname: ${d.nickname}`);
  if (d.birthDate) parts.push(`Birth: ${d.birthDate}${d.birthPlace ? ` in ${d.birthPlace}` : ""}`);
  if (d.deathDate) parts.push(`Death: ${d.deathDate}${d.deathPlace ? ` in ${d.deathPlace}` : ""}`);
  if (d.events?.length) {
    d.events.forEach((e) => {
      if (e.type && (e.date || e.place)) {
        parts.push(`${e.type}: ${e.date || ""}${e.place ? ` in ${e.place}` : ""}`);
      }
    });
  }
  return parts.join("\n");
};

// Quebec historical place name mappings
const PLACE_HISTORY = {
  "rivière-du-loup": "Formerly known as Fraserville until 1919. Located in Bas-Saint-Laurent region.",
  "fraserville": "Renamed to Rivière-du-Loup in 1919. Located in Bas-Saint-Laurent region.",
  "la malbaie": "Includes former parishes: Sainte-Agnès, Saint-Fidèle, Cap-à-l'Aigle. Charlevoix region.",
  "baie-saint-paul": "One of the oldest parishes in Charlevoix, founded 1681. Original parish for much of Charlevoix.",
  "québec": "The city includes many historic parishes: Notre-Dame-de-Québec (1621), Saint-Roch, Saint-Sauveur, Saint-Jean-Baptiste, etc.",
  "montréal": "Historic parishes include Notre-Dame, Saint-Jacques, Saint-Louis, Saint-Henri, etc.",
  "trois-rivières": "One of the first settlements in New France (1634). Historic parishes: Immaculée-Conception, etc.",
  "charlevoix": "Region including parishes: Baie-Saint-Paul, Les Éboulements, La Malbaie, Petite-Rivière-Saint-François.",
  "beauce": "Region south of Quebec City. Historic parishes: Saint-Joseph, Sainte-Marie, Saint-Georges.",
  "île d'orléans": "Island parishes: Sainte-Famille (1666), Saint-Pierre, Saint-Jean, Saint-Laurent, Saint-François, Sainte-Pétronille.",
  "kamouraska": "Bas-Saint-Laurent region. Founded 1674. One of the oldest parishes on the south shore.",
  "l'islet": "Côte-du-Sud region. Parish founded 1677.",
  "lotbinière": "South shore region across from Quebec City. Parish founded 1694.",
};

// Create the MCP server
const server = new Server(
  {
    name: "heritage-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_family_tree",
        description: "Get an overview of the entire family tree, listing all people with their basic info",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_person",
        description: "Get detailed information about a specific person by their name",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name (or partial name) of the person to find",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "search_people",
        description: "Search for people in the family tree by various criteria",
        inputSchema: {
          type: "object",
          properties: {
            surname: {
              type: "string",
              description: "Last name to search for",
            },
            given_name: {
              type: "string",
              description: "First name to search for",
            },
            birth_place: {
              type: "string",
              description: "Birth place to search for",
            },
            birth_year: {
              type: "string",
              description: "Birth year to search for",
            },
          },
        },
      },
      {
        name: "lookup_place_history",
        description: "Look up historical information about a Quebec place name, including old names, parish history, and regional context",
        inputSchema: {
          type: "object",
          properties: {
            place_name: {
              type: "string",
              description: "The place name to look up",
            },
          },
          required: ["place_name"],
        },
      },
      {
        name: "suggest_records",
        description: "Get suggestions for which records to search for a person based on their known information",
        inputSchema: {
          type: "object",
          properties: {
            person_name: {
              type: "string",
              description: "Name of the person to get record suggestions for",
            },
          },
          required: ["person_name"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_family_tree") {
    const data = loadHeritageData();
    if (!data) {
      return {
        content: [{ type: "text", text: "No Heritage file loaded. Set HERITAGE_FILE environment variable to point to your .json file." }],
      };
    }

    const people = (data.nodes || []).filter((n) => n.type === "person");
    if (people.length === 0) {
      return {
        content: [{ type: "text", text: "No people found in the family tree." }],
      };
    }

    const summary = people.map((p) => {
      const d = p.data;
      const name = [d.firstName, d.lastName].filter(Boolean).join(" ") || "Unknown";
      const dates = d.dates || "";
      return `- ${name}${dates ? ` (${dates})` : ""}`;
    }).join("\n");

    return {
      content: [{ type: "text", text: `Family Tree (${people.length} people):\n\n${summary}` }],
    };
  }

  if (name === "get_person") {
    const data = loadHeritageData();
    if (!data) {
      return {
        content: [{ type: "text", text: "No Heritage file loaded." }],
      };
    }

    const searchName = (args.name || "").toLowerCase();
    const person = (data.nodes || []).find((n) => {
      if (n.type !== "person") return false;
      const d = n.data;
      const fullName = [d.title, d.firstName, d.middleName, d.lastName, d.nickname]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fullName.includes(searchName);
    });

    if (!person) {
      return {
        content: [{ type: "text", text: `No person found matching "${args.name}"` }],
      };
    }

    return {
      content: [{ type: "text", text: formatPerson(person) }],
    };
  }

  if (name === "search_people") {
    const data = loadHeritageData();
    if (!data) {
      return {
        content: [{ type: "text", text: "No Heritage file loaded." }],
      };
    }

    const matches = (data.nodes || []).filter((n) => {
      if (n.type !== "person") return false;
      const d = n.data;

      if (args.surname && !d.lastName?.toLowerCase().includes(args.surname.toLowerCase())) {
        return false;
      }
      if (args.given_name && !d.firstName?.toLowerCase().includes(args.given_name.toLowerCase())) {
        return false;
      }
      if (args.birth_place && !d.birthPlace?.toLowerCase().includes(args.birth_place.toLowerCase())) {
        return false;
      }
      if (args.birth_year && !d.birthDate?.includes(args.birth_year)) {
        return false;
      }
      return true;
    });

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: "No matching people found." }],
      };
    }

    const results = matches.map((p) => formatPerson(p)).join("\n\n---\n\n");
    return {
      content: [{ type: "text", text: `Found ${matches.length} matching people:\n\n${results}` }],
    };
  }

  if (name === "lookup_place_history") {
    const placeName = (args.place_name || "").toLowerCase().trim();
    const info = PLACE_HISTORY[placeName];

    if (info) {
      return {
        content: [{ type: "text", text: `${args.place_name}:\n${info}` }],
      };
    }

    // Try partial matches
    const partialMatches = Object.entries(PLACE_HISTORY)
      .filter(([key]) => key.includes(placeName) || placeName.includes(key))
      .map(([key, value]) => `${key}: ${value}`);

    if (partialMatches.length > 0) {
      return {
        content: [{ type: "text", text: `Related places:\n\n${partialMatches.join("\n\n")}` }],
      };
    }

    return {
      content: [{
        type: "text",
        text: `No specific historical information found for "${args.place_name}". This place may be:\n` +
          `- A smaller parish within a larger region\n` +
          `- Known by a different spelling\n` +
          `- A more recent municipality\n\n` +
          `Try searching for the broader region (e.g., Charlevoix, Beauce, Côte-du-Sud).`
      }],
    };
  }

  if (name === "suggest_records") {
    const data = loadHeritageData();
    if (!data) {
      return {
        content: [{ type: "text", text: "No Heritage file loaded." }],
      };
    }

    const searchName = (args.person_name || "").toLowerCase();
    const person = (data.nodes || []).find((n) => {
      if (n.type !== "person") return false;
      const d = n.data;
      const fullName = [d.firstName, d.lastName].filter(Boolean).join(" ").toLowerCase();
      return fullName.includes(searchName);
    });

    if (!person) {
      return {
        content: [{ type: "text", text: `No person found matching "${args.person_name}"` }],
      };
    }

    const d = person.data;
    const suggestions = [];

    // Suggest based on what's missing
    if (!d.birthDate || d.birthDate.includes("~")) {
      suggestions.push("- Search for BAPTISM record to confirm exact birth date");
    }
    if (!d.birthPlace) {
      suggestions.push("- Search for BAPTISM record to find birth place");
    }
    if (d.birthPlace && !d.events?.some((e) => e.type === "baptism")) {
      suggestions.push(`- Look for BAPTISM in ${d.birthPlace} parish records`);
    }
    if (!d.deathDate && d.birthDate) {
      const birthYear = parseInt(d.birthDate.match(/\d{4}/)?.[0] || "0");
      if (birthYear && birthYear < 1950) {
        suggestions.push("- Search for BURIAL record");
      }
    }
    if (!d.events?.some((e) => e.type === "marriage")) {
      suggestions.push("- Search for MARRIAGE records");
    }

    // Suggest sources based on time period and location
    const birthYear = parseInt(d.birthDate?.match(/\d{4}/)?.[0] || "0");
    const isQuebec = (d.birthPlace || "").toLowerCase().match(/quebec|québec|qc|charlevoix|beauce|montreal|montréal/);

    if (isQuebec) {
      suggestions.push("\nRecommended sources for Quebec research:");
      suggestions.push("- genealogiequebec.com - Best for Catholic parish records");
      suggestions.push("- FamilySearch.org - Free, good coverage");
      suggestions.push("- BAnQ (numerique.banq.qc.ca) - Notarial records, census");
      if (birthYear >= 1926) {
        suggestions.push("- Institut de la statistique du Québec - Civil vital records after 1926");
      }
    }

    const personInfo = formatPerson(person);
    return {
      content: [{
        type: "text",
        text: `Current information:\n${personInfo}\n\nSuggested records to search:\n${suggestions.join("\n")}`
      }],
    };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
});

// List resources (the family tree file)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const filePath = getHeritageFilePath();
  if (!filePath) {
    return { resources: [] };
  }

  return {
    resources: [
      {
        uri: `file://${filePath}`,
        name: "Heritage Family Tree",
        description: "The currently loaded family tree data",
        mimeType: "application/json",
      },
    ],
  };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const filePath = getHeritageFilePath();
  if (!filePath || !request.params.uri.includes(filePath)) {
    return {
      contents: [{ uri: request.params.uri, text: "Resource not found" }],
    };
  }

  const data = loadHeritageData();
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
