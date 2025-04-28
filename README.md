 # google-search-mcp-server

 A ModelContextProtocol (MCP) server that provides Google Search capabilities as a tool. It performs web scraping of Google Search results and returns structured data including titles, URLs, and snippets.

 ## Overview

 `google-search-mcp-server` implements an MCP server exposing a single tool, `google_search`, which accepts a search query and returns search results in a JSON-compatible format. It supports pagination, configurable language, safe search, result limits, and uses random user agents to reduce scraping detection.

 Key features:
 - Google search scraping via HTTP requests
 - Structured JSON output with title, URL, and snippet
 - Supports pagination, result limits, and language/country options
 - "I'm Feeling Lucky" single-result mode
 - Built-in cookie jar and random user-agent for each search

 ## Installation

 **Requirements:**
 - Node.js v16 or higher
 - pnpm or bun for package management

 **Clone and install dependencies:**

 ```bash
 git clone https://github.com/yourusername/google-search-mcp-server.git
 cd google-search-mcp-server
 pnpm install
# or
bun install
 ```

 ## Usage

 ### Start the MCP Server

 Start the server, which listens for JSON-RPC requests over standard input/output:

 ```bash
 npm start
 ```

 Upon startup, you will see:

 ```
 Google Search MCP Server running on stdio
 ```

 ### Interact with the Server

 Use any JSON-RPC 2.0 client (e.g., `jq`, custom scripts) to list tools and call the `google_search` tool.

 **List available tools:**
 ```bash
 echo '{"jsonrpc":"2.0","method":"ListTools","params":{},"id":1}' | npm start
 ```

 **Call the `google_search` tool:**
 ```bash
 echo '{"jsonrpc":"2.0","method":"CallTool","params":{"name":"google_search","arguments":{"query":"OpenAI","num":5}},"id":2}' | npm start
 ```

 **Example response:**
 ```json
 {
   "jsonrpc": "2.0",
   "id": 2,
   "result": {
     "content": [
       {
         "type": "text",
         "text": "{\"results\":[...JSON string of search results...]}"
       }
     ],
     "isError": false
   }
 }
 ```

 ### Playground

 For local experimentation without MCP protocol, use the provided `playground.ts` script:

 ```bash
 npx esno src/playground.ts
 ```

 This will run example searches and log results to the console.

 ## License

 This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
