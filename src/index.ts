import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { GoogleSearchArgs, SearchResultItem } from './types'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { search } from 'src/googleSearch'

function isGoogleSearchArgs(args: any): args is GoogleSearchArgs {
  return (
    typeof args.query === 'string'
    && (args.num === undefined || typeof args.num === 'number')
    && (args.start === undefined || typeof args.start === 'number')
    && (args.stop === undefined || typeof args.stop === 'number')
  )
}

const server = new Server(
  {
    name: 'google-search',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

const GOOGLE_SEARCH_TOOL: Tool = {
  name: 'google_search',
  description: 'Performs Google search and returns results with title, URL and description.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find relevant content',
      },
      num: {
        type: 'number',
        description: 'Number of results to return (default: 10)',
        default: 10,
      },
      start: {
        type: 'number',
        description: 'Start index for results (default: 0)',
        default: 0,
      },
      stop: {
        type: 'number',
        description: 'Stop index for results (default: null)',
        default: null,
      },
    },
    required: ['query'],
  },
}

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [GOOGLE_SEARCH_TOOL],
}))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    if (!args) {
      throw new Error('No arguments provided')
    }

    switch (name) {
      case 'google_search': {
        if (!isGoogleSearchArgs(args)) {
          throw new Error('Invalid arguments for google_search')
        }

        const { query, ...searchArgs } = args

        const results = [] as SearchResultItem[]

        for await (const result of search(query, searchArgs)) {
          results.push(result)
        }

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: 'No results found' }],
            isError: true,
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ results }),
            },
          ],
          isError: false,
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        }
    }
  }
  catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    }
  }
})

// Run server
async function runServer() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Google Search MCP Server running on stdio')
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error)
  process.exit(1)
})
