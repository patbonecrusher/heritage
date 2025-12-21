# Heritage MCP Server

An MCP (Model Context Protocol) server that connects your Heritage family tree to Claude Desktop, enabling AI-powered genealogical research using your Claude Pro subscription.

## Features

The MCP server provides these tools to Claude:

- **get_family_tree** - Get an overview of everyone in your tree
- **get_person** - Get detailed info about a specific person
- **search_people** - Search by surname, given name, birth place, or year
- **lookup_place_history** - Look up Quebec historical place names
- **suggest_records** - Get suggestions for records to search

## How It Works

The Heritage app automatically writes the current file path to `~/.heritage/config.json` whenever you open or save a file. The MCP server reads this config to know which file to use.

This means:
- No manual configuration of file paths needed
- Automatically uses whatever file you have open in Heritage
- Switch files in Heritage and the MCP server uses the new one

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
      "args": ["/path/to/heritage/mcp-server/index.js"]
    }
  }
}
```

Replace `/path/to/heritage/mcp-server/index.js` with the actual path.

### 3. Restart Claude Desktop

After updating the config, restart Claude Desktop. You should see the Heritage tools available.

### 4. Open a file in Heritage

Open Heritage and load a family tree file. The MCP server will automatically detect it.

## Usage

Once configured, you can ask Claude things like:

- "Show me everyone in my family tree"
- "What do you know about Jean Tremblay?"
- "Find all people with the surname Gagnon"
- "What records should I search for Marie Bouchard?"
- "What's the history of Baie-Saint-Paul as a parish?"

## Future: Database Support

When Heritage moves to a database, the MCP server can be updated to connect directly to the database instead of reading JSON files. The Claude Desktop config won't need to change.

## Development

To test with a specific file:

```bash
HERITAGE_FILE=/path/to/test.json node index.js
```

The server communicates via stdio using the MCP protocol.
