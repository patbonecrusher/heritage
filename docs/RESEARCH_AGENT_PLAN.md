# Genealogical Research Agent - Implementation Plan

## Overview

Build an AI-powered research agent integrated into Heritage that can:
- Resolve historical place names to modern equivalents
- Search genealogy websites (with user credentials)
- Find and interpret records
- Provide research suggestions and strategies

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Heritage App                                               │
│  ┌────────────────────┐  ┌────────────────────────────────┐ │
│  │  Family Tree       │  │  Research Agent Panel          │ │
│  │                    │  │                                │ │
│  │  [Jean Tremblay]───┼──▶ "Find birth record for Jean   │ │
│  │   b. ~1845         │  │  Tremblay, born around 1845   │ │
│  │   Baie-St-Paul     │  │  in Baie-St-Paul"             │ │
│  │                    │  │                                │ │
│  └────────────────────┘  │  Agent: "I'll search...        │ │
│                          │  - genealogiequebec.com        │ │
│                          │  - FamilySearch                │ │
│                          │  - BAnQ archives"              │ │
│                          └───────────────┬────────────────┘ │
└──────────────────────────────────────────┼──────────────────┘
                                           │
                    ┌──────────────────────┴───────────────────┐
                    ▼                                          ▼
           ┌───────────────┐                         ┌─────────────────┐
           │  Claude API   │                         │  Browser Tools  │
           │  (Agent Loop) │                         │  (Puppeteer)    │
           └───────┬───────┘                         └────────┬────────┘
                   │                                          │
                   │  Tools:                                  │
                   │  ├─ web_search                           │
                   │  ├─ lookup_place_history ◀───────────────┤
                   │  ├─ search_genealogie_quebec ◀───────────┤
                   │  ├─ search_familysearch ◀────────────────┤
                   │  └─ search_banq ◀────────────────────────┘
                   ▼
           ┌───────────────┐
           │  Results      │
           │  & Sources    │
           └───────────────┘
```

## Components

### 1. Research Panel UI
- Sidebar or modal chat interface
- Shows conversation history with agent
- Displays search results with links to sources
- "Research" button on each person node
- Context-aware: knows which person is being researched

### 2. Agent Core (Claude API)
- Uses Anthropic SDK with tool_use
- Agent loop: Claude decides actions, executes tools, interprets results
- System prompt with genealogy expertise
- Maintains conversation context

### 3. Tool Definitions

#### `web_search`
General web search for historical context, place name changes, etc.
```javascript
{
  name: "web_search",
  description: "Search the web for historical or genealogical information",
  parameters: {
    query: { type: "string", description: "Search query" }
  }
}
```

#### `lookup_place_history`
Resolve historical place names to modern equivalents.
```javascript
{
  name: "lookup_place_history",
  description: "Look up historical place names and their modern equivalents",
  parameters: {
    place_name: { type: "string" },
    year: { type: "number", optional: true },
    region: { type: "string", optional: true }
  }
}
```

#### `search_genealogie_quebec`
Search genealogiequebec.com (requires user credentials).
```javascript
{
  name: "search_genealogie_quebec",
  description: "Search Quebec Catholic parish records on genealogiequebec.com",
  parameters: {
    record_type: { enum: ["baptism", "marriage", "burial", "all"] },
    surname: { type: "string" },
    given_name: { type: "string", optional: true },
    father_name: { type: "string", optional: true },
    mother_name: { type: "string", optional: true },
    spouse_name: { type: "string", optional: true },
    year_from: { type: "number", optional: true },
    year_to: { type: "number", optional: true },
    parish: { type: "string", optional: true },
    region: { type: "string", optional: true }
  }
}
```

#### `search_familysearch`
Search FamilySearch.org (free, no login required for basic search).
```javascript
{
  name: "search_familysearch",
  description: "Search FamilySearch.org historical records",
  parameters: {
    surname: { type: "string" },
    given_name: { type: "string", optional: true },
    birth_year: { type: "number", optional: true },
    birth_place: { type: "string", optional: true },
    death_year: { type: "number", optional: true },
    record_type: { type: "string", optional: true }
  }
}
```

#### `search_banq`
Search BAnQ (Bibliothèque et Archives nationales du Québec).
```javascript
{
  name: "search_banq",
  description: "Search Quebec national archives",
  parameters: {
    query: { type: "string" },
    collection: { type: "string", optional: true }
  }
}
```

### 4. Browser Automation (Puppeteer)
- Handles login to subscription sites
- Navigates search forms
- Extracts and parses results
- Screenshots for verification (optional)

### 5. Credentials Storage
- Secure storage using electron-store with encryption
- Preferences UI for entering site credentials
- Per-site credential management

## Implementation Phases

### Phase 1: Foundation
1. Add Anthropic SDK dependency
2. Create preferences UI for API key and site credentials
3. Build basic Research Panel component
4. Implement agent loop with Claude API

### Phase 2: Basic Tools
1. Implement `web_search` tool (using web search API or scraping)
2. Implement `lookup_place_history` tool
3. Test basic research conversations

### Phase 3: Genealogie Quebec Integration
1. Add Puppeteer for browser automation
2. Implement login flow for genealogiequebec.com
3. Implement search and result extraction
4. Handle CAPTCHA/rate limiting gracefully

### Phase 4: Additional Sources
1. Implement FamilySearch integration
2. Implement BAnQ integration
3. Add more sources as needed

### Phase 5: Enhanced Features
1. Auto-populate person data from found records
2. Save sources to person automatically
3. Research history/session persistence
4. Batch research for multiple family members

## File Structure

```
src/
├── components/
│   ├── ResearchPanel.jsx       # Main research UI
│   ├── ResearchMessage.jsx     # Chat message component
│   └── ResearchResult.jsx      # Search result display
├── services/
│   ├── agent/
│   │   ├── index.js            # Agent loop
│   │   ├── tools.js            # Tool definitions
│   │   └── prompts.js          # System prompts
│   └── scrapers/
│       ├── genealogieQuebec.js # GQ scraper
│       ├── familySearch.js     # FS scraper
│       └── banq.js             # BAnQ scraper
└── utils/
    └── secureStorage.js        # Encrypted credential storage
```

## Agent System Prompt

```
You are a genealogical research assistant specializing in Quebec and
French-Canadian ancestry. You help users find historical records,
understand place name changes, and piece together family histories.

When researching:
1. Consider spelling variations (e.g., Tremblay/Tremblé)
2. Account for historical place name changes
3. Note that Quebec Catholic records are comprehensive from ~1621
4. Suggest multiple search strategies
5. Explain your reasoning and findings clearly

Available tools: [tool descriptions]

Current person context: [person data from Heritage]
```

## Example Agent Interaction

```
User: Find the baptism record for Marie Gagnon, daughter of
      Pierre Gagnon and Josephte Bouchard, born around 1823
      in the Charlevoix region

Agent: I'll search for Marie Gagnon's baptism record. Since this
       is Quebec Catholic records from the 1820s, I'll start with
       genealogiequebec.com which has excellent coverage of this
       period.

       [Calls search_genealogie_quebec with parameters]

Agent: I found 2 potential matches:

       1. **Marie Gagnon** - Baptized March 15, 1823
          - Parish: Notre-Dame-de-l'Assomption, Baie-Saint-Paul
          - Father: Pierre Gagnon
          - Mother: Josephte Bouchard
          - Godparents: Jean-Baptiste Tremblay, Marie Simard

       2. **Marie Gagnon** - Baptized November 2, 1824
          - Parish: Saint-Pierre, Les Éboulements
          - Father: Pierre Gagnon
          - Mother: Josephte Boucher (note spelling variation)
          - Godparents: François Gagnon, Marguerite Lavoie

       The first record looks like a strong match. Would you like
       me to search for more records to confirm, or shall I add
       this information to the person's profile?
```

## Security Considerations

- API keys stored encrypted, never in plain text
- Site credentials stored with electron-store encryption
- No credentials logged or sent to external services
- Puppeteer runs in user's context, not headless by default (optional)

## Dependencies to Add

```json
{
  "@anthropic-ai/sdk": "^0.27.0",
  "puppeteer": "^21.0.0",
  "electron-store": "^8.1.0"
}
```

## Open Questions

1. **Rate limiting**: How to handle sites that limit searches?
2. **CAPTCHA**: How to handle CAPTCHA on login pages?
3. **Result caching**: Should we cache search results locally?
4. **Offline mode**: Should agent work offline with cached data?
5. **Multi-language**: Support for French prompts/responses?
