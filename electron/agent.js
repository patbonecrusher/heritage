const Anthropic = require('@anthropic-ai/sdk');
const secureStore = require('./secureStore');

// Tool definitions for the research agent
const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web for historical or genealogical information. Use this for general research, place name history, historical context, etc.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'lookup_place_history',
    description: 'Look up historical place names and their modern equivalents. Useful for resolving old parish names, county changes, etc.',
    input_schema: {
      type: 'object',
      properties: {
        place_name: {
          type: 'string',
          description: 'The historical or current place name to look up'
        },
        year: {
          type: 'number',
          description: 'Optional: The year to contextualize the place name'
        },
        region: {
          type: 'string',
          description: 'Optional: The broader region (e.g., Quebec, Ontario)'
        }
      },
      required: ['place_name']
    }
  },
  {
    name: 'search_genealogie_quebec',
    description: 'Search Quebec Catholic parish records on genealogiequebec.com. Requires user credentials configured in preferences.',
    input_schema: {
      type: 'object',
      properties: {
        record_type: {
          type: 'string',
          enum: ['baptism', 'marriage', 'burial', 'all'],
          description: 'Type of record to search'
        },
        surname: {
          type: 'string',
          description: 'Family name to search'
        },
        given_name: {
          type: 'string',
          description: 'First name (optional)'
        },
        father_name: {
          type: 'string',
          description: 'Father\'s name for baptism records (optional)'
        },
        mother_name: {
          type: 'string',
          description: 'Mother\'s name for baptism records (optional)'
        },
        spouse_name: {
          type: 'string',
          description: 'Spouse\'s name for marriage records (optional)'
        },
        year_from: {
          type: 'number',
          description: 'Start year for search range (optional)'
        },
        year_to: {
          type: 'number',
          description: 'End year for search range (optional)'
        },
        parish: {
          type: 'string',
          description: 'Specific parish to search (optional)'
        }
      },
      required: ['surname', 'record_type']
    }
  }
];

// System prompt for the genealogy research agent
const SYSTEM_PROMPT = `You are a genealogical research assistant specializing in Quebec and French-Canadian ancestry. You help users find historical records, understand place name changes, and piece together family histories.

Key knowledge areas:
- Quebec Catholic parish records (baptisms, marriages, burials) from ~1621 onwards
- French-Canadian naming conventions and spelling variations
- Historical Quebec geography and parish boundaries
- Common record sources: BAnQ, Genealogie Quebec, FamilySearch, Ancestry

When researching:
1. Consider spelling variations (e.g., Tremblay/Tremblé, Gagnon/Gaignon)
2. Account for historical place name changes (many Quebec parishes were renamed or merged)
3. Note that women are typically recorded with their maiden names in Quebec records
4. Latin was used in early records (Joannes = Jean, Maria = Marie)
5. Suggest multiple search strategies when initial searches don't yield results

Always explain your reasoning and findings clearly. When you find records, provide key details like dates, places, and family connections.`;

// Execute a tool call
async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'web_search':
      // For now, return a placeholder - will implement actual search later
      return {
        success: true,
        result: `Web search for "${toolInput.query}" - This feature requires additional setup. Consider searching manually on Google or using genealogy-specific sites.`
      };

    case 'lookup_place_history':
      // Provide some common Quebec place name mappings
      const placeMappings = {
        'rivière-du-loup': 'Formerly known as Fraserville until 1919',
        'la malbaie': 'Includes the former parishes of Sainte-Agnès, Saint-Fidèle',
        'baie-saint-paul': 'One of the oldest parishes in Charlevoix, founded 1681',
        'québec': 'The city includes many historic parishes: Notre-Dame-de-Québec (1621), Saint-Roch, Saint-Sauveur, etc.',
      };

      const searchKey = toolInput.place_name.toLowerCase();
      const info = placeMappings[searchKey];

      return {
        success: true,
        result: info
          ? `${toolInput.place_name}: ${info}`
          : `No specific historical information found for "${toolInput.place_name}". Try searching with alternate spellings or the broader region.`
      };

    case 'search_genealogie_quebec':
      const creds = secureStore.getCredentials('genealogieQuebec');
      if (!creds?.username || !creds?.password) {
        return {
          success: false,
          error: 'Genealogie Quebec credentials not configured. Please add them in Preferences.'
        };
      }

      // For now, return a placeholder - will implement actual scraping with Puppeteer later
      return {
        success: true,
        result: `Search request for ${toolInput.record_type} records:\n` +
          `- Surname: ${toolInput.surname}\n` +
          (toolInput.given_name ? `- Given name: ${toolInput.given_name}\n` : '') +
          (toolInput.year_from || toolInput.year_to ? `- Years: ${toolInput.year_from || '?'} - ${toolInput.year_to || '?'}\n` : '') +
          `\nNote: Full Genealogie Quebec integration requires Puppeteer setup. For now, please search manually at genealogiequebec.com with your credentials.`
      };

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}

// Main agent function
async function runAgent(messages, personContext) {
  const apiKey = secureStore.getApiKey();

  if (!apiKey) {
    return {
      error: 'Claude API key not configured. Please add it in Preferences.'
    };
  }

  const client = new Anthropic({ apiKey });

  // Build the messages array for the API
  const systemMessage = personContext
    ? `${SYSTEM_PROMPT}\n\nCurrent person context:\n${personContext}`
    : SYSTEM_PROMPT;

  // Convert our message format to Claude's format
  const claudeMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role,
      content: m.content
    }));

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemMessage,
      tools: TOOLS,
      messages: claudeMessages
    });

    // Check if the model wants to use tools
    const toolCalls = [];
    let textContent = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        // Execute the tool
        const toolResult = await executeTool(block.name, block.input);
        toolCalls.push({
          name: block.name,
          input: block.input,
          result: toolResult.success ? toolResult.result : toolResult.error
        });

        // If we need to continue the conversation with tool results
        if (response.stop_reason === 'tool_use') {
          // Add the assistant message with tool use
          const messagesWithToolResult = [
            ...claudeMessages,
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: toolResult.success ? toolResult.result : `Error: ${toolResult.error}`
              }]
            }
          ];

          // Continue the conversation
          const followUp = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemMessage,
            tools: TOOLS,
            messages: messagesWithToolResult
          });

          // Extract text from follow-up
          for (const followBlock of followUp.content) {
            if (followBlock.type === 'text') {
              textContent += followBlock.text;
            }
          }
        }
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };

  } catch (error) {
    console.error('Agent error:', error);
    return {
      error: error.message || 'An error occurred while processing your request.'
    };
  }
}

module.exports = { runAgent };
