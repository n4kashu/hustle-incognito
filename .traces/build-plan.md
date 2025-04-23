# Emblem Vault Hustle Incognito SDK - Build Plan

**Version:** 0.1 (Initial Draft)
**Date:** 2025-04-22

## 1. Introduction & Goals

**Product:** Emblem Vault Hustle Incognito SDK
**Purpose:** To provide a TypeScript-first SDK for interacting with the Agent Hustle API (`/api/chat`). This SDK aims to abstract the complexities of the API interaction, support both streaming and non-streaming responses, handle authentication, and facilitate headless operation by managing the tool execution loop via callbacks. It should be easily integrable into Node.js server environments and potentially browser-based applications.
**Target Audience:** Developers building applications that leverage Agent Hustle's capabilities, including internal Emblem Vault projects and external partners requiring a white-label solution.

**Core Goals:**
*   Provide a simple, intuitive interface mirroring the Vercel AI SDK (`useChat`, `streamText`) where applicable, but adapted for server-side/headless use.
*   Support header-based authentication (Service Key and potential User Key/Secret mechanism).
*   Handle streaming (`streamText`-like) and non-streaming (`generateObject`-like, but for chat) responses.
*   Implement a robust callback mechanism (`onToolCall`) to allow the consuming application to execute requested tools and return results, enabling headless operation.
*   Minimize dependencies and ensure high portability (Node.js primary, browser secondary).
*   Structure code for testability, with comprehensive examples in tests.
*   Keep changes to the core Hustle-v2 API (`/api/chat`) minimal.

## 2. Architecture & Design

**Core Components:**
*   `EmblemVaultHustleIncognitoClient`: The main class or set of functions developers will interact with. Responsible for configuration (API endpoint, auth) and making API calls.
*   `requestHandler` (Internal): Handles the actual `fetch` requests, adding authentication headers, and processing responses (both streaming and non-streaming).
*   `streamProcessor` (Internal): Manages the reading and parsing of the AI SDK's `DataStream` for streaming responses, extracting text, tool calls, and other metadata.
*   `toolCallbackHandler` (Internal): Orchestrates the interaction with the user-provided `onToolCall` callback when tool calls are received from the API.

**Key Design Principles:**
*   **Simplicity:** Favor simple functions and clear interfaces over complex class hierarchies where possible.
*   **Immutability:** Avoid mutating input messages or configuration objects.
*   **Asynchronous:** All API interactions will be asynchronous (`async/await`).
*   **Error Handling:** Provide clear error messages and types.
*   **Dependency Injection (for testing):** Allow injecting a custom `fetch` function or mock responses for testing.

**Authentication Flow:**
1.  Client initialization requires the Agent Hustle API URL.
2.  Authentication details (Service Key or User Key) are provided either during initialization or per-request.
3.  The `requestHandler` adds the appropriate `Authorization` header (e.g., `Bearer YOUR_SERVICE_KEY` or a custom scheme for user keys) to the outgoing `fetch` request.
4.  The `/api/chat` endpoint in Hustle-v2 needs to be updated to read and validate these headers. *Initial focus will be on the Service Key*.

**Streaming vs. Non-Streaming:**
*   **Streaming (`chatStream`):**
    *   Uses `fetch` to connect to the API.
    *   Returns an `AsyncIterable<AIStreamChunk>` (or similar standard stream type).
    *   The `streamProcessor` reads the stream.
    *   If `tool_calls` chunk is received: pause stream reading, invoke `onToolCall`, send results back via a *new* API request (passing tool results in the body), and resume/process the *new* stream.
    *   Yield text chunks, errors, and potentially other metadata chunks.
*   **Non-Streaming (`chat`):**
    *   Makes the initial `fetch` request.
    *   If the response contains `tool_calls`: invoke `onToolCall`, make a *second* API request with the results, and wait for the final response.
    *   Return the complete final assistant message (e.g., `CoreMessage` or similar).

**Tool Handling (`onToolCall`):**
*   The SDK receives `tool_calls` from the API (either mid-stream or in the initial non-streaming response).
*   The SDK invokes the user-provided `onToolCall(toolCalls): Promise<ToolResult[]>`. 
*   The user's application executes the tools and returns the results.
*   The SDK sends these `tool_results` back to the Agent Hustle API in the next request body.
*   This loop continues until the API returns a final message without `tool_calls`.

## 3. Implementation Tasks

**Phase 1: Core Setup & Basic Chat**
*   [ ] **Project Setup:** Initialize Node.js project (`package.json`), configure TypeScript (`tsconfig.json`), setup build process (e.g., `tsup` or `tsc`), configure linter/formatter (ESLint/Prettier).
*   [ ] **Define Core Types:** Create TypeScript interfaces for `EmblemVaultHustleIncognitoClientOptions`, `ChatMessage`, `ToolCall`, `ToolResult`, API request/response structures.
*   [ ] **Implement `EmblemVaultHustleIncognitoClient` (Basic):** Create the basic client structure, constructor for options (URL, service key).
*   [ ] **Implement `requestHandler` (Internal):** Basic fetch implementation, adding service key `Authorization` header.
*   [ ] **Implement `chat` (Non-Streaming, No Tools):** Implement the non-streaming chat function assuming no tool calls are initially involved. Test basic request/response.
*   [ ] **Update Hustle-v2 API:** Modify `/api/chat/route.ts` to accept and prioritize a service `Authorization: Bearer <key>` header.

**Phase 2: Streaming & Tool Handling**
*   [ ] **Implement `chatStream` (Streaming, No Tools):** Implement streaming using `fetch` and `ReadableStream`. Adapt Vercel AI SDK's stream parsing logic if possible. Test basic text streaming.
*   [ ] **Implement `onToolCall` Handling:**
    *   Modify `chat` and `chatStream` to detect `tool_calls`.
    *   Implement the logic to pause processing, call the user's `onToolCall` function.
    *   Implement the logic to send `tool_results` back to the API in a subsequent request.
    *   Handle the loop until a final message is received.
*   [ ] **Refine `streamProcessor`:** Ensure it correctly handles interleaved text, tool calls, and potentially tool results chunks within the stream.
*   [ ] **Add Comprehensive Tests:** Write unit and integration tests covering:
    *   Initialization
    *   Authentication (service key)
    *   Basic chat (non-streaming)
    *   Basic streaming
    *   Tool call loop (both streaming and non-streaming)
    *   Error handling

**Phase 3: Advanced Features & Polish**
*   [ ] **User Key Authentication:** Design and implement the user key/secret hashing and validation mechanism (requires coordination with Hustle-v2 API changes).
*   [ ] **Browser Compatibility:** Test and adjust for browser environments (using `fetch` directly, potential CORS considerations if API is hosted separately). Ensure package can be bundled for browser use.
*   [ ] **Configuration Options:** Add options for custom headers, fetch parameters, timeouts, etc.
*   [ ] **Documentation:** Refine README, add API reference documentation (e.g., using TypeDoc).
*   [ ] **Examples:** Create more detailed examples for various use cases.
*   [ ] **Publishing:** Prepare for publishing to npm (package naming, versioning).

## 4. Potential Challenges & Considerations

*   **Hustle API Stability:** The SDK depends on the `/api/chat` endpoint. Changes there will require SDK updates.
*   **Tool Handling Complexity:** Managing the state machine for the tool call loop, especially in streaming mode, can be intricate. Need robust error handling if the user's `onToolCall` fails or returns invalid results.
*   **Authentication Security:** The user key/secret mechanism needs careful design to avoid security vulnerabilities. Hashing and storage on the server side must be secure.
*   **Dependency Management:** Keep external dependencies minimal to avoid conflicts and maintain portability. Rely on native Node.js/browser APIs (like `fetch`, `ReadableStream`) as much as possible.
*   **Vercel AI SDK Differences:** While aiming for similarity, this SDK *must* handle the server-side/headless aspect, particularly tool calls, which `useChat` doesn't manage directly in the same way. The internal logic will differ significantly.
*   **Error Propagation:** Clearly propagate errors from the API or the `onToolCall` callback back to the SDK user.

## 5. Next Steps

1.  Initialize the Node.js project structure.
2.  Begin implementing Phase 1 tasks, starting with core types and client setup.

## 6. New SDK Design

### Overview

This document outlines the plan for building the Emblem Vault Hustle Incognito SDK, focusing on implementation details, key features, and phased development approach.

### Architecture

The SDK will be structured around a central client class with supporting modules for specific functions. The architecture is designed to provide maximum flexibility for different usage patterns while maintaining a clean API.

#### Core Components

*   **EmblemVaultHustleIncognitoClient**: Main entry point for SDK users, providing three distinct interfacing patterns:
  * Raw passthrough streaming (direct access to underlying API responses)
  * Processed streaming (typed chunks with parsing and structure)
  * Complete request/response (non-streaming with full response aggregation)

*   **Stream Processing**: Handle the specific Agent Hustle API streaming format, which uses distinct prefixes for different content types:
  * `0:` - Text content chunks
  * `9:` - Tool call requests
  * `a:` - Tool execution results
  * `f:` - Message ID information
  * `e:` - Completion metadata
  * `d:` - Final summary data
  * `2:` - Path routing information

*   **Tool Handling**: Support for automated or custom tool execution through:
  * Detection of tool calls in the stream
  * Callback mechanism for headless operation
  * Proper formatting of tool results for the API

### Authentication and API Communication

Based on our testing with the actual API, we now understand:

1. **Authentication**: 
   * The API expects an `apiKey` in the request body (not in headers as initially assumed)
   * Support both service-level keys (provided at client initialization) and user-specific keys (provided per request)

2. **Request Format**:
   * The API expects specific parameters like `vaultId`, `externalWalletAddress`, `slippageSettings`, etc.
   * Message history is provided in a standard chat message format

3. **Response Handling**:
   * The API returns a stream with specific prefixed chunks that need parsing
   * Different prefix types require different processing logic

### Implementation Tasks

#### Phase 1: Core Setup (Current)

1. ✅ Project initialization with TypeScript, ESLint, Prettier, and build tools
2. ✅ Define key types based on actual API behavior
3. ✅ Implement `EmblemVaultHustleIncognitoClient` class with three interface options:
   * `rawStream()` - Passthrough mode with minimal processing
   * `chatStream()` - Processed streaming with typed chunks
   * `chat()` - Complete request/response aggregation

#### Phase 2: API Communication & Streaming

1. **Request Handling**
   * Implement request preparation with proper body format
   * Add validation for required parameters
   * Handle errors gracefully

2. **Stream Processing**
   * Implement parsing logic for all prefix types (`0:`, `9:`, `a:`, `f:`, `e:`, `d:`, `2:`)
   * Convert raw stream to structured typed chunks
   * Provide aggregation logic for complete responses

3. **Tool Execution**
   * Detect tool calls in the stream
   * Support `onToolCall` callback pattern
   * Properly format tool results for continuation

#### Phase 3: Additional Features & Testing

1. **Enhanced Features**
   * Support for attachments (if needed)
   * Path tracking and redirection
   * Custom slippage settings
   * Safe mode toggle

2. **Testing & Documentation**
   * Unit tests for all components
   * Integration tests with mock API
   * Comprehensive JSDoc comments
   * Generated API reference
   * Usage examples

### API Interface

Based on our testing, the SDK will expose these primary methods:

```typescript
// Raw passthrough (maximum control)
public async *rawStream(options: StreamOptions): AsyncIterable<RawChunk>

// Processed streaming (parsed typed chunks)
public async *chatStream(options: StreamOptions): AsyncIterable<StreamChunk | RawChunk>

// Complete request/response (with optional raw mode)
public async chat(options: StreamOptions & { 
  rawResponse?: boolean 
}): Promise<ProcessedResponse | RawChunk[]>
```

With options supporting:
- Required: `vaultId`, `messages`
- Optional: `userApiKey`, `externalWalletAddress`, `slippageSettings`, `safeMode`, `currentPath`, `onToolCall`, `processChunks`

### Potential Challenges & Solutions

1. **API Changes**:
   * Design for flexibility to accommodate future API changes
   * Use interface-based approach for extensibility

2. **Tool Handling in Headless Mode**:
   * Provide clear documentation on how to implement tool execution callbacks
   * Include examples for common tools

3. **Browser Support**:
   * Ensure compatibility with both modern browsers and Node.js environments
   * Provide options for custom fetch implementations

4. **Error Handling**:
   * Implement comprehensive error handling for network issues, API errors, and stream parsing problems
   * Provide typed error responses

### Testing Approach

The SDK will be tested at multiple levels:

1. **Unit Tests**:
   * Core parsing functions
   * Stream processing logic
   * Client request construction

2. **Integration Tests**:
   * Mock API responses for all scenarios
   * End-to-end flow with simulated tools

3. **Browser Compatibility Tests**:
   * Verify in major browsers
   * Test in Node.js environment

## 7. Comprehensive Testing Plan

### Unit Test Structure

The unit tests will be organized into focused test suites using Vitest as the testing framework:

#### 1. Client Initialization Tests
```typescript
// client.initialization.test.ts
describe('EmblemVaultHustleIncognitoClient initialization', () => {
  test('should initialize with default baseUrl when not provided', () => {
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'test-key' });
    expect(client).toHaveProperty('baseUrl', 'http://localhost:3000');
  });
  
  test('should initialize with custom baseUrl when provided', () => {
    const client = new EmblemVaultHustleIncognitoClient({ 
      hustleApiUrl: 'https://custom-api.example.com',
      serviceApiKey: 'test-key' 
    });
    expect(client).toHaveProperty('baseUrl', 'https://custom-api.example.com');
  });
  
  test('should initialize with custom fetch implementation when provided', () => {
    const mockFetch = vi.fn();
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    // Test mockFetch is used in subsequent operations
  });
});
```

#### 2. Request Preparation Tests
```typescript
// request.preparation.test.ts
describe('Request preparation', () => {
  test('should throw error when no API key is provided', () => {
    const client = new EmblemVaultHustleIncognitoClient({});
    expect(() => client.prepareRequestBody({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    })).toThrow('API key is required');
  });
  
  test('should use service API key when user API key is not provided', () => {
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'service-key' });
    const result = client.prepareRequestBody({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    expect(result.apiKey).toBe('service-key');
  });
  
  test('should prioritize user API key over service API key when both provided', () => {
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'service-key' });
    const result = client.prepareRequestBody({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      userApiKey: 'user-key'
    });
    expect(result.apiKey).toBe('user-key');
  });
  
  test('should use default settings when not provided', () => {
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'service-key' });
    const result = client.prepareRequestBody({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    expect(result.safeMode).toBe(true);
    expect(result.slippageSettings).toEqual({ 
      lpSlippage: 5, 
      swapSlippage: 5, 
      pumpSlippage: 5 
    });
  });
});
```

#### 3. Stream Parsing Tests
```typescript
// stream.parsing.test.ts
describe('Stream parsing', () => {
  test('should parse text chunks correctly', async () => {
    const mockReadable = createMockStream([
      '0:"Hello "',
      '0:"world!"'
    ]);
    
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'test-key' });
    const chunks = [];
    
    for await (const chunk of client.parseRawStream(mockReadable)) {
      chunks.push(chunk);
    }
    
    expect(chunks).toEqual([
      { prefix: '0', data: 'Hello ', raw: '0:"Hello "' },
      { prefix: '0', data: 'world!', raw: '0:"world!"' }
    ]);
  });
  
  test('should parse tool call chunks correctly', async () => {
    const toolCallData = { toolCallId: 'test-id', toolName: 'test-tool', args: { key: 'value' } };
    const mockReadable = createMockStream([
      `9:${JSON.stringify(toolCallData)}`,
    ]);
    
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'test-key' });
    const chunks = [];
    
    for await (const chunk of client.parseRawStream(mockReadable)) {
      chunks.push(chunk);
    }
    
    expect(chunks).toEqual([
      { prefix: '9', data: toolCallData, raw: `9:${JSON.stringify(toolCallData)}` }
    ]);
  });
  
  test('should handle malformed JSON gracefully', async () => {
    const mockReadable = createMockStream([
      '0:{"broken":"json',
    ]);
    
    const client = new EmblemVaultHustleIncognitoClient({ serviceApiKey: 'test-key' });
    const chunks = [];
    
    for await (const chunk of client.parseRawStream(mockReadable)) {
      chunks.push(chunk);
    }
    
    expect(chunks[0].prefix).toBe('error');
  });
});
```

#### 4. Raw Stream Tests
```typescript
// raw.stream.test.ts
describe('Raw stream mode', () => {
  test('should pass through raw chunks without processing', async () => {
    const mockResponse = {
      ok: true,
      body: createMockStream([
        '0:"Hello"',
        '9:{"toolCallId":"test-id","toolName":"test-tool","args":{}}'
      ])
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const chunks = [];
    for await (const chunk of client.rawStream({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    })) {
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBe(2);
    expect(chunks[0].prefix).toBe('0');
    expect(chunks[1].prefix).toBe('9');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });
});
```

#### 5. Processed Stream Tests
```typescript
// processed.stream.test.ts
describe('Processed stream mode', () => {
  test('should convert raw chunks to structured data', async () => {
    const mockResponse = {
      ok: true,
      body: createMockStream([
        '0:"Hello"',
        '9:{"toolCallId":"test-id","toolName":"test-tool","args":{}}'
      ])
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const chunks = [];
    for await (const chunk of client.chatStream({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      processChunks: true
    })) {
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toEqual({ type: 'text', value: 'Hello' });
    expect(chunks[1]).toEqual({ 
      type: 'tool_call', 
      value: { toolCallId: 'test-id', toolName: 'test-tool', args: {} } 
    });
  });
  
  test('should execute onToolCall callback when provided', async () => {
    const mockResponse = {
      ok: true,
      body: createMockStream([
        '9:{"toolCallId":"test-id","toolName":"test-tool","args":{}}'
      ])
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    const mockToolCall = vi.fn().mockResolvedValue({ 
      toolCallId: 'test-id', 
      result: { success: true } 
    });
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const chunks = [];
    for await (const chunk of client.chatStream({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      processChunks: true,
      onToolCall: mockToolCall
    })) {
      chunks.push(chunk);
    }
    
    expect(mockToolCall).toHaveBeenCalledWith({ 
      toolCallId: 'test-id', 
      toolName: 'test-tool', 
      args: {} 
    });
    
    expect(chunks.some(c => c.type === 'tool_result')).toBe(true);
  });
});
```

#### 6. Complete Response Tests
```typescript
// complete.response.test.ts
describe('Complete response mode', () => {
  test('should aggregate text chunks into single response', async () => {
    const mockResponse = {
      ok: true,
      body: createMockStream([
        '0:"Hello "',
        '0:"world!"',
        'f:{"messageId":"msg-123"}',
        'e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":20}}'
      ])
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const response = await client.chat({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    expect(response.content).toBe('Hello world!');
    expect(response.messageId).toBe('msg-123');
    expect(response.usage).toEqual({ promptTokens: 10, completionTokens: 20 });
  });
  
  test('should collect raw chunks when rawResponse is true', async () => {
    const mockResponse = {
      ok: true,
      body: createMockStream([
        '0:"Hello"',
        'f:{"messageId":"msg-123"}'
      ])
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const response = await client.chat({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      rawResponse: true
    });
    
    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBe(2);
    expect(response[0].prefix).toBe('0');
    expect(response[1].prefix).toBe('f');
  });
  
  test('should handle and collect tool calls and results', async () => {
    const mockResponse = {
      ok: true,
      body: createMockStream([
        '0:"Analyzing token..."',
        '9:{"toolCallId":"test-id","toolName":"test-tool","args":{}}',
        'a:{"toolCallId":"test-id","result":{"data":"test-result"}}',
        '0:"Analysis complete."'
      ])
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const response = await client.chat({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Analyze token' }]
    });
    
    expect(response.content).toBe('Analyzing token...Analysis complete.');
    expect(response.toolCalls.length).toBe(1);
    expect(response.toolResults.length).toBe(1);
  });
});
```

#### 7. Error Handling Tests
```typescript
// error.handling.test.ts
describe('Error handling', () => {
  test('should handle HTTP errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    await expect(client.chat({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    })).rejects.toThrow('HTTP error: 401 Unauthorized');
  });
  
  test('should handle network errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    await expect(client.chat({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }]
    })).rejects.toThrow('Network error');
  });
  
  test('should emit error chunks in streaming mode', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Stream error'));
    
    const client = new EmblemVaultHustleIncognitoClient({ 
      serviceApiKey: 'test-key',
      fetch: mockFetch
    });
    
    const stream = client.chatStream({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      processChunks: true
    });
    
    let errorChunk = null;
    try {
      for await (const chunk of stream) {
        if (chunk.type === 'error') {
          errorChunk = chunk;
          break;
        }
      }
    } catch (e) {
      // Expected to throw after emitting error chunk
    }
    
    expect(errorChunk).not.toBeNull();
    expect(errorChunk.type).toBe('error');
    expect(errorChunk.value).toContain('Stream error');
  });
});
```

### Test Utility Functions

```typescript
// test-utils.ts
export function createMockStream(chunks: string[]): ReadableStream {
  let index = 0;
  return new ReadableStream({
    start(controller) {
      // Convert chunks to TextEncoder format
      chunks.forEach(chunk => {
        controller.enqueue(new TextEncoder().encode(chunk + '\n'));
      });
      controller.close();
    }
  });
}

export function getMockResponse(statusCode = 200, body: any = null): Response {
  const status = statusCode;
  const ok = status >= 200 && status < 300;
  
  let streamBody = null;
  if (Array.isArray(body)) {
    streamBody = createMockStream(body);
  }
  
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    body: streamBody,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}
```

## 8. Example Applications

To demonstrate the SDK's capabilities, we'll build the following examples:

### 1. Basic CLI Example

This example will show how to use the SDK in a simple Node.js CLI application:

```typescript
// examples/cli-example.ts
import { EmblemVaultHustleIncognitoClient } from 'emblemvault-hustle-incognito';
import * as readline from 'readline';

const API_KEY = process.env.HUSTLE_API_KEY || '';
const VAULT_ID = process.env.VAULT_ID || '';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '';

if (!API_KEY || !VAULT_ID) {
  console.error('Please set HUSTLE_API_KEY and VAULT_ID environment variables');
  process.exit(1);
}

const client = new EmblemVaultHustleIncognitoClient({
  serviceApiKey: API_KEY
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('=== Emblemvault Incognito Hustle CLI Example ===');
  console.log('Enter "quit" to exit\n');
  
  const messages: { role: string, content: string }[] = [];
  
  // Main chat loop
  while (true) {
    const userInput = await new Promise<string>(resolve => {
      rl.question('You: ', resolve);
    });
    
    if (userInput.toLowerCase() === 'quit') {
      break;
    }
    
    messages.push({ role: 'user', content: userInput });
    
    process.stdout.write('AI: ');
    
    try {
      // Use streaming to show response in real-time
      const stream = client.chatStream({
        vaultId: VAULT_ID,
        messages,
        externalWalletAddress: WALLET_ADDRESS,
        processChunks: true,
        onToolCall: async (toolCall) => {
          console.log(`\n[Tool Call] ${toolCall.toolName}: ${JSON.stringify(toolCall.args)}`);
          return {
            toolCallId: toolCall.toolCallId,
            result: { 
              message: `CLI mock execution of ${toolCall.toolName}`,
              success: true
            }
          };
        }
      });
      
      // Initialize empty response
      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          process.stdout.write(chunk.value);
          fullResponse += chunk.value;
        } else if (chunk.type === 'tool_result') {
          console.log(`\n[Tool Result] ${JSON.stringify(chunk.value.result)}`);
        }
      }
      
      console.log('\n');
      
      // Add assistant's response to message history
      messages.push({ role: 'assistant', content: fullResponse });
      
    } catch (error) {
      console.error('\nError:', error);
    }
  }
  
  rl.close();
  console.log('Goodbye!');
}

main();
```

### 2. Web Application Example

This example demonstrates using the SDK in a browser environment with React:

```typescript
// examples/web-example.tsx
import React, { useState, useRef, useEffect } from 'react';
import { EmblemVaultHustleIncognitoClient } from 'emblemvault-hustle-incognito';

// Configuration (in a real app, these would come from environment or user input)
const API_KEY = 'your-api-key';
const VAULT_ID = 'your-vault-id';
const WALLET_ADDRESS = 'your-wallet-address';

const client = new EmblemVaultHustleIncognitoClient({
  serviceApiKey: API_KEY
});

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isPending?: boolean;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [toolCalls, setToolCalls] = useState([]);
  
  const messageEndRef = useRef<null | HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };
    
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isPending: true
    };
    
    setMessages(prev => [...prev, userMessage, aiMessage]);
    setInput('');
    setIsStreaming(true);
    setCurrentResponse('');
    setToolCalls([]);
    
    try {
      // Prepare message history for API
      const messageHistory = messages
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));
      
      // Use streaming to update UI in real-time
      const stream = client.chatStream({
        vaultId: VAULT_ID,
        messages: messageHistory,
        externalWalletAddress: WALLET_ADDRESS,
        processChunks: true,
        onToolCall: async (toolCall) => {
          // In a real app, we might implement actual tool execution
          // For now, we'll just return mock data
          console.log('Tool call:', toolCall);
          return {
            toolCallId: toolCall.toolCallId,
            result: { success: true, data: 'Mock tool execution result' }
          };
        }
      });
      
      // Initialize empty response
      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullResponse += chunk.value;
          
          // Update the AI message with accumulated text
          setMessages(prev => 
            prev.map(m => 
              m.id === aiMessage.id 
                ? { ...m, content: fullResponse, isPending: true } 
                : m
            )
          );
        }
        
        // Handle other chunk types as needed
        if (chunk.type === 'tool_call') {
          console.log('Tool called:', chunk.value);
        } else if (chunk.type === 'tool_result') {
          console.log('Tool result:', chunk.value);
        }
      }
      
      // Finalize the message
      setMessages(prev => 
        prev.map(m => 
          m.id === aiMessage.id 
            ? { ...m, content: fullResponse, isPending: false } 
            : m
        )
      );
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Update AI message to show error
      setMessages(prev => 
        prev.map(m => 
          m.id === aiMessage.id 
            ? { ...m, content: 'Sorry, an error occurred. Please try again.', isPending: false } 
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };
  
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
          >
            <div className="message-content">{message.content || (message.isPending ? '...' : '')}</div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          disabled={isStreaming}
        />
        <button onClick={sendMessage} disabled={isStreaming || !input.trim()}>
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

### 3. Raw Stream Debugging Example

This example demonstrates accessing and parsing the raw stream format:

```typescript
// examples/raw-stream-debug.ts
import { EmblemVaultHustleIncognitoClient } from 'emblemvault-hustle-incognito';
import dotenv from 'dotenv';

dotenv.config();

const client = new EmblemVaultHustleIncognitoClient({
  serviceApiKey: process.env.HUSTLE_API_KEY
});

async function inspectRawStream() {
  console.log('=== Raw Stream Inspector ===');
  
  try {
    const rawStream = client.rawStream({
      vaultId: process.env.VAULT_ID || 'default',
      messages: [{ 
        role: 'user', 
        content: 'Show me trending tokens and analyze BONK' 
      }]
    });
    
    console.log('Starting stream capture...\n');
    
    // Capture all chunks to analyze prefixes and formats
    const chunks = [];
    
    for await (const chunk of rawStream) {
      chunks.push(chunk);
      console.log(`Prefix: ${chunk.prefix}, Raw: ${chunk.raw.substring(0, 100)}${chunk.raw.length > 100 ? '...' : ''}`);
    }
    
    // Analyze prefix distribution
    const prefixCounts = chunks.reduce((acc, chunk) => {
      acc[chunk.prefix] = (acc[chunk.prefix] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n=== Stream Analysis ===');
    console.log(`Total chunks: ${chunks.length}`);
    console.log('Prefix distribution:');
    Object.entries(prefixCounts).forEach(([prefix, count]) => {
      console.log(`  ${prefix}: ${count} chunks (${Math.round((count as number) / chunks.length * 100)}%)`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

inspectRawStream();
```

These example applications and comprehensive test suite will provide developers with clear guidance on how to use the SDK in various scenarios while ensuring reliability through proper test coverage.

### Documentation Plan

Documentation will include:

1. **README.md**: Quick start, examples, and core concepts
2. **API Reference**: Generated from JSDoc comments
3. **Examples**: Common use cases and patterns
4. **Contributing Guide**: For future contributors
```