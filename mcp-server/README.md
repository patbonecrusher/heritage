# Heritage MCP Server

An MCP (Model Context Protocol) server that connects your Heritage family tree to Claude Desktop, enabling AI-powered genealogical research using your Claude Pro subscription.

## Features

The MCP server provides these tools to Claude:

- **get_family_tree** - Get an overview of everyone in your tree
- **get_person** - Get detailed info about a specific person
- **search_people** - Search by surname, given name, birth place, or year
- **lookup_place_history** - Look up Quebec historical place names
- **suggest_records** - Get suggestions for records to search

## Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "heritage": {
      "command": "node",
      "args": ["/path/to/heritage/mcp-server/index.js"],
      "env": {
        "HERITAGE_FILE": "/path/to/your/family-tree.json"
      }
    }
  }
}
```

Replace:
- `/path/to/heritage/mcp-server/index.js` with the actual path to the MCP server
- `/path/to/your/family-tree.json` with the path to your saved Heritage file

### 3. Restart Claude Desktop

After updating the config, restart Claude Desktop. You should see the Heritage tools available.

## Usage

Once configured, you can ask Claude things like:

- "Show me everyone in my family tree"
- "What do you know about Jean Tremblay?"
- "Find all people with the surname Gagnon"
- "What records should I search for Marie Bouchard?"
- "What's the history of Baie-Saint-Paul as a parish?"

## Example Conversation

```
You: What records should I search for Jean Tremblay born around 1845 in Charlevoix?

Claude: [Uses suggest_records and lookup_place_history tools]

Based on the information for Jean Tremblay, here are my recommendations:

Current information:
- Name: Jean Tremblay
- Birth: ~1845 in Charlevoix

Suggested records to search:
- Search for BAPTISM record to confirm exact birth date
- Look for BAPTISM in Charlevoix parish records (likely Baie-Saint-Paul
  or La Malbaie - these were the main parishes in that region)
- Search for MARRIAGE records

Recommended sources for Quebec research:
- genealogiequebec.com - Best for Catholic parish records
- FamilySearch.org - Free, good coverage
- BAnQ - Notarial records, census

Historical context: Charlevoix region includes parishes Baie-Saint-Paul
(founded 1681), Les Éboulements, La Malbaie, and Petite-Rivière-Saint-François.
```

## Development

To test the server locally:

```bash
HERITAGE_FILE=/path/to/test.json node index.js
```

The server communicates via stdio using the MCP protocol.
