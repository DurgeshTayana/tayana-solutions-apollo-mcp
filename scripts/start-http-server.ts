// Suppress url.parse() deprecation warnings
(process as any).noDeprecation = true;

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ApolloServer } from '../src/apollo-server.js';
import { ApolloClient, stripUrl } from '../src/apollo-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// Get port from environment variable or default to 3000
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Optional server authorization token (for protecting the server itself)
const SERVER_AUTH_TOKEN = process.env.APOLLO_IO_API_KEY;

/**
 * Extract Apollo.io API key from multiple possible header locations
 * Supports: X-Apollo-Api-Key, X-Api-Key, Authorization header, query param, or body
 */
const extractApolloApiKey = (req: express.Request): string | null => {
  // Try headers first (multiple formats supported)
  const headerKey = 
    req.headers['x-apollo-api-key'] || 
    req.headers['apollo-api-key'] || 
    req.headers['x-api-key'];

  if (headerKey && typeof headerKey === 'string') {
    return headerKey;
  }

  // Try Authorization header (Bearer token format)
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    // Support both "Bearer <key>" and "ApiKey <key>" formats
    const match = authHeader.match(/^(?:Bearer|ApiKey)\s+(.+)$/i);
    if (match && match[1]) {
      return match[1];
    }
    // If no prefix, assume the whole value is the key
    if (authHeader.trim()) {
      return authHeader.trim();
    }
  }

  // Try query parameter
  if (req.query.apollo_api_key && typeof req.query.apollo_api_key === 'string') {
    return req.query.apollo_api_key;
  }

  // Try body (for POST requests)
  if (req.body && typeof req.body === 'object') {
    if (req.body.apollo_api_key && typeof req.body.apollo_api_key === 'string') {
      return req.body.apollo_api_key;
    }
    if (req.body.api_key && typeof req.body.api_key === 'string') {
      return req.body.api_key;
    }
  }

  return null;
};

/**
 * Middleware to extract and validate Apollo.io API key from request
 * Attaches the API key to req.apolloApiKey for use in route handlers
 */
const apolloApiKeyMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  const apiKey = extractApolloApiKey(req);
  console.log('apiKey', apiKey);
  console.log('req.headers', req.headers);
  console.log('req.body', req.body);
  console.log('req.query', req.query);
  console.log('req.params', req.params);
  console.log('req.method', req.method);
  console.log('req.url', req.url);
  console.log('req.path', req.path);
  console.log('req.protocol', req.protocol);
  console.log('req.hostname', req.hostname);
  if (!apiKey) {
    res.status(401).json({
      error: 'Missing Apollo.io API key',
      message: 'Provide API key via one of the following methods:',
      methods: [
        'Header: X-Apollo-Api-Key',
        'Header: X-Api-Key',
        'Header: Authorization: Bearer <key>',
        'Query parameter: ?apollo_api_key=<key>',
        'Body field: { "apollo_api_key": "<key>" }'
      ]
    });
    return;
  }

  // Attach API key to request object for use in route handlers
  (req as any).apolloApiKey = apiKey;
  next();
};

/**
 * Middleware for optional server authorization token
 * Only enforces auth if SERVER_AUTH_TOKEN environment variable is set
 */
const serverAuthMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  // If no server auth token is configured, skip authentication
  if (!SERVER_AUTH_TOKEN) {
    next();
    return;
  }

  // Extract token from headers
  const authHeader = req.headers['authorization'] || req.headers['x-server-token'];
  
  let token: string | undefined;
  if (typeof authHeader === 'string') {
    // Support "Bearer <token>" format
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    token = match ? match[1] : authHeader;
  } else if (Array.isArray(authHeader)) {
    token = authHeader[0];
  }

  // Validate token
  if (!token || token !== SERVER_AUTH_TOKEN) {
    console.log("Invalid or missing server authorization token");
    res.status(401).json({
      error: 'Unauthorized token available',
      message: 'Invalid or missing server authorization token',
      hint: 'Provide token via Authorization: Bearer <token> or X-Server-Token header'
    });
    return;
  }

  next();
};

// Helper function to handle a single JSON-RPC request
async function handleJsonRpcRequest(request: any, apiKey?: string): Promise<any> {
  const requestId = request.id !== undefined ? request.id : null;
  const method = request.method;
  
  console.log(`JSON-RPC request - Method: ${method}, ID: ${requestId}`);
  
  if (method === 'tools/list') {
    // Create server instance (API key optional, uses env var if not provided)
    const server = new ApolloServer(apiKey);
    const tools = server.getTools();
    
    // Return JSON-RPC response
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        tools: tools
      }
    };
  } else if (method === 'tools/call') {
    // Handle tool call request
    const toolName = request.params?.name;
    const toolArgs = request.params?.arguments || {};
    
    if (!toolName) {
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32602,
          message: 'Invalid params: tool name is required'
        }
      };
    }
    
    try {
      const server = new ApolloServer(apiKey);
      const result = await server.callTool(toolName, toolArgs);
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (error: any) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32000,
          message: `Tool execution failed: ${error.message}`,
          data: error.message
        }
      };
    }
  } else if (method === 'initialize') {
    // Handle initialize request
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'apollo-io-manager',
          version: '1.0.0'
        }
      }
    };
  } else {
    // Unknown method
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  }
}

// POST endpoint for getting tools list (RESTful API and MCP JSON-RPC)
// Supports both n8n MCP client (JSON-RPC) and simple REST requests
// Also supports HTTP streamable transport
app.post('/mcp', async (req, res) => {
  console.log('Received POST request to /mcp');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request headers:', req.headers);
  
  // Set proper headers for HTTP streaming
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    // Extract API key (optional - will use env var if not provided)
    const apiKey = extractApolloApiKey(req) || process.env.APOLLO_IO_API_KEY || undefined;
    
    // Check if this is a JSON-RPC request (from n8n MCP client)
    // Support both single request and batch requests (array)
    const isJsonRpc = req.body && typeof req.body === 'object' && 
                     ('jsonrpc' in req.body || 'method' in req.body);
    const isBatch = Array.isArray(req.body) && req.body.length > 0 && 
                    req.body.some((item: any) => item && typeof item === 'object' && ('jsonrpc' in item || 'method' in item));
    
    if (isJsonRpc || isBatch) {
      // Handle JSON-RPC request(s) from n8n MCP client
      if (isBatch) {
        // Handle batch request (array of JSON-RPC requests)
        console.log(`Processing batch request with ${req.body.length} requests`);
        const responses = await Promise.all(
          req.body.map((request: any) => handleJsonRpcRequest(request, apiKey))
        );
        // Filter out notifications (requests without id)
        const filteredResponses = responses.filter((response: any) => response.id !== null);
        return res.json(filteredResponses.length > 0 ? filteredResponses : null);
      } else {
        // Handle single JSON-RPC request
        const response = await handleJsonRpcRequest(req.body, apiKey);
        
        // Don't send response for notifications (requests without id)
        if (response.id !== null) {
          console.log(`Returning JSON-RPC response for method: ${req.body.method}`);
          return res.json(response);
        } else {
          // Notification - no response needed
          return res.status(204).send();
        }
      }
    } else {
      // Handle simple REST request (non-JSON-RPC)
      const server = new ApolloServer(apiKey);
      const tools = server.getTools();
      
      console.log(`Returning ${tools.length} tools via REST API`);
      return res.json({
        tools: tools,
        count: tools.length
      });
    }
  } catch (error: any) {
    console.error('Error in /mcp endpoint:', error);
    
    // Check if this was a JSON-RPC request
    const isJsonRpc = req.body && typeof req.body === 'object' && 
                     ('jsonrpc' in req.body || 'method' in req.body);
    const isBatch = Array.isArray(req.body);
    
    if (isJsonRpc || isBatch) {
      const requestId = isBatch ? null : (req.body?.id !== undefined ? req.body.id : null);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32000,
          message: 'Server error',
          data: error.message
        }
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to get tools list',
        message: error.message 
      });
    }
  }
});

// GET endpoint for establishing SSE stream
app.get('/mcp', async (req, res) => {
  console.log('Received GET request to /mcp (establishing SSE stream)');
  try {
    const apiKey = (req as any).apolloApiKey;
    // Create a new SSE transport for the client
    // The endpoint for POST messages is '/messages'
    const transport = new SSEServerTransport('/messages', res);
    
    // Store the transport by session ID
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;
    
    // Set up onclose handler to clean up transport when closed
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
    };
    
    // Connect the transport to the MCP server
    const server = new ApolloServer(apiKey);
    await server.connect(transport);
    res.status(200).send('SSE stream established');
    console.log(`Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error('Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
});

// Messages endpoint for receiving client JSON-RPC requests
app.post('/messages', async (req, res) => {
  console.log('Received POST request to /messages');
  
  // Extract session ID from URL query parameter
  // In the SSE protocol, this is added by the client based on the endpoint event
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    console.error('No session ID provided in request URL');
    res.status(400).send('Missing sessionId parameter');
    return;
  }
  
  const transport = transports[sessionId];
  if (!transport) {
    console.error(`No active transport found for session ID: ${sessionId}`);
    res.status(404).send('Session not found');
    return;
  }
  
  try {
    // Handle the POST message with the transport
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error handling request');
    }
  }
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeSessions: Object.keys(transports).length,
    timestamp: new Date().toISOString(),
    serverAuthRequired: !!SERVER_AUTH_TOKEN
  });
});

// REST API Endpoints for n8n and HTTP clients

// People Enrichment endpoint
app.post('/api/v1/people/enrichment', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const client = new ApolloClient(apiKey);
    
    // Extract query parameters from request body
    const query = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      domain: req.body.domain,
      organization_name: req.body.organization_name,
      linkedin_url: req.body.linkedin_url,
    };
    
    // Validate that at least one parameter is provided
    const hasParams = Object.values(query).some(value => value !== undefined && value !== null && value !== '');
    if (!hasParams) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one parameter is required: first_name, last_name, email, domain, organization_name, or linkedin_url'
      });
    }
    
    const result = await client.peopleEnrichment(query);
    res.json(result);
  } catch (error: any) {
    console.error('People enrichment error:', error);
    res.status(500).json({ 
      error: 'People enrichment failed',
      message: error.message 
    });
  }
});

// Organization Enrichment endpoint
// Supports both domain and URL parameters
app.get('/api/v1/organizations/enrichment', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const domainParam = req.query.domain as string;
    const urlParam = req.query.url as string;
    
    // Extract domain from URL if provided, otherwise use domain directly
    let domain: string;
    if (urlParam) {
      const extractedDomain = stripUrl(urlParam);
      if (!extractedDomain) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid URL provided. Could not extract domain.'
        });
      }
      domain = extractedDomain;
    } else if (domainParam) {
      domain = domainParam;
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: domain or url'
      });
    }
    
    const client = new ApolloClient(apiKey);
    const result = await client.organizationEnrichment(domain);
    res.json(result);
  } catch (error: any) {
    console.error('Organization enrichment error:', error);
    res.status(500).json({ 
      error: 'Organization enrichment failed',
      message: error.message 
    });
  }
});

// People Search endpoint
app.post('/api/v1/people/search', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const client = new ApolloClient(apiKey);
    
    // Pass all query parameters from request body
    const result = await client.peopleSearch(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('People search error:', error);
    res.status(500).json({ 
      error: 'People search failed',
      message: error.message 
    });
  }
});

// Organization Search endpoint
app.post('/api/v1/organizations/search', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const client = new ApolloClient(apiKey);
    
    // Pass all query parameters from request body
    const result = await client.organizationSearch(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Organization search error:', error);
    res.status(500).json({ 
      error: 'Organization search failed',
      message: error.message 
    });
  }
});

// Organization Job Postings endpoint
app.get('/api/v1/organizations/:organizationId/jobs', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const organizationId = req.params.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: organizationId'
      });
    }
    
    const client = new ApolloClient(apiKey);
    const result = await client.organizationJobPostings(organizationId);
    res.json(result);
  } catch (error: any) {
    console.error('Organization job postings error:', error);
    res.status(500).json({ 
      error: 'Organization job postings failed',
      message: error.message 
    });
  }
});

// Get Person Email endpoint
app.get('/api/v1/people/:apolloId/email', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const apolloId = req.params.apolloId;
    
    if (!apolloId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: apolloId'
      });
    }
    
    const client = new ApolloClient(apiKey);
    const result = await client.getPersonEmail(apolloId);
    res.json({ emails: result });
  } catch (error: any) {
    console.error('Get person email error:', error);
    res.status(500).json({ 
      error: 'Get person email failed',
      message: error.message 
    });
  }
});

// Employees of Company endpoint
app.post('/api/v1/companies/employees', serverAuthMiddleware, apolloApiKeyMiddleware, async (req, res) => {
  try {
    const apiKey = (req as any).apolloApiKey;
    const client = new ApolloClient(apiKey);
    
    const query = {
      company: req.body.company,
      website_url: req.body.website_url,
      linkedin_url: req.body.linkedin_url,
      person_seniorities: req.body.person_seniorities,
      contact_email_status: req.body.contact_email_status,
    };
    
    if (!query.company) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: company'
      });
    }
    
    const result = await client.employeesOfCompany(query);
    res.json({ employees: result });
  } catch (error: any) {
    console.error('Employees of company error:', error);
    res.status(500).json({ 
      error: 'Employees of company failed',
      message: error.message 
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Apollo.io MCP Server API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      mcp: {
        tools: 'POST /mcp - Get list of available tools',
        sse: 'GET /mcp - Establish SSE stream',
        messages: 'POST /messages?sessionId=<session_id> - Send JSON-RPC messages'
      },
      rest: {
        peopleEnrichment: 'POST /api/v1/people/enrichment',
        organizationEnrichment: 'GET /api/v1/organizations/enrichment?domain=<domain> or ?url=<url>',
        peopleSearch: 'POST /api/v1/people/search',
        organizationSearch: 'POST /api/v1/organizations/search',
        organizationJobPostings: 'GET /api/v1/organizations/:organizationId/jobs',
        getPersonEmail: 'GET /api/v1/people/:apolloId/email',
        employeesOfCompany: 'POST /api/v1/companies/employees'
      }
    },
    authentication: {
      apolloApiKey: 'Required in headers: X-Apollo-Api-Key, X-Api-Key, or Authorization: Bearer <key>',
      serverAuthToken: SERVER_AUTH_TOKEN ? 'Required in headers: Authorization: Bearer <token> or X-Server-Token' : 'Optional (not configured)'
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Apollo.io MCP Server (HTTP/SSE) listening on port ${PORT}`);
  console.log(`\nMCP Protocol Endpoints:`);
  console.log(`  POST   /mcp - Get list of available tools`);
  console.log(`  GET    /mcp - Establish SSE stream`);
  console.log(`  POST   /messages?sessionId=<session_id> - Send JSON-RPC messages`);
  console.log(`\nUtility Endpoints:`);
  console.log(`  GET    /health - Health check`);
  console.log(`  GET    /api - API documentation`);
  console.log(`\nREST API Endpoints:`);
  console.log(`  POST   /api/v1/people/enrichment`);
  console.log(`  GET    /api/v1/organizations/enrichment?domain=<domain> or ?url=<url>`);
  console.log(`  POST   /api/v1/people/search`);
  console.log(`  POST   /api/v1/organizations/search`);
  console.log(`  GET    /api/v1/organizations/:organizationId/jobs`);
  console.log(`  GET    /api/v1/people/:apolloId/email`);
  console.log(`  POST   /api/v1/companies/employees`);
  if (SERVER_AUTH_TOKEN) {
    console.log(`\nServer authorization: ENABLED`);
  } else {
    console.log(`\nServer authorization: DISABLED (set SERVER_AUTH_TOKEN to enable)`);
  }
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  console.log('Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  
  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  process.exit(0);
});

