# Emblem Vault Hustle Incognito SDK

> **Power your applications with EmblemVault's AI Agent Hustle API – the secure, intelligent assistant for crypto & web3.**

[![npm version](https://img.shields.io/npm/v/emblemvault-hustle-incognito.svg)](https://www.npmjs.com/package/emblemvault-hustle-incognito)
[![License](https://img.shields.io/npm/l/emblemvault-hustle-incognito.svg)](LICENSE)

## ✨ Build an AI-powered CLI in 10 lines

```typescript
import { HustleIncognitoClient } from 'emblemvault-hustle-incognito';

// Create client with your API key
const client = new HustleIncognitoClient({
  apiKey: process.env.HUSTLE_API_KEY
});

// Get a response from the AI
const response = await client.chat([
  { role: 'user', content: 'What can you tell me about the current gas prices on Ethereum?' }
], { vaultId: process.env.VAULT_ID });

console.log(response.content);
```

## 🚀 Features

- **Three Flexible Modes**: Simple request/response, processed streaming, or raw API output
- **Intelligent AI Agent**: Access to 20+ built-in crypto & web3 tools
- **Both Browser & Node.js**: Works seamlessly in any JavaScript environment
- **Minimal Setup**: Production-ready with sensible defaults
- **Highly Configurable**: Advanced options when you need them
- **Built for Testing**: Override pattern allows easy mocking

## 🔑 Authentication

Authentication is simple - just provide your API key when initializing the client:

```typescript
const client = new HustleIncognitoClient({
  apiKey: 'your-api-key-here',
  // Optional configuration
  hustleApiUrl: 'https://custom-api-endpoint.com', // Defaults to production endpoint
  debug: true // Enable verbose logging
});
```

## 🔍 Usage Modes

### 1️⃣ Simple Request/Response

Perfect for CLI tools or simple applications - send a message, get back a complete response:

```typescript
// Get a complete response
const response = await client.chat([
  { role: 'user', content: 'Show me the top Solana Tokens this week' }
], { vaultId: 'my-vault' });

console.log(response.content);
console.log(`Used ${response.usage?.total_tokens} tokens`);

// Tool calls are also available
if (response.toolCalls?.length > 0) {
  console.log('Agent used these tools:', response.toolCalls);
}
```

### 2️⃣ Processed Streaming (for interactive UIs)

Receive typed, structured chunks for building interactive experiences:

```typescript
// For UIs with streaming responses
for await (const chunk of client.chatStream({ 
  messages: [{ role: 'user', content: 'Show me the top Solana tokens this week' }],
  vaultId: 'my-vault',
  processChunks: true 
})) {
  switch (chunk.type) {
    case 'text':
      ui.appendText(chunk.value);
      break;
    case 'tool_call':
      ui.showToolInProgress(chunk.value);
      break;
    case 'tool_result':
      ui.showToolResult(chunk.value);
      break;
    case 'finish':
      ui.complete(chunk.value);
      break;
  }
}
```

### 3️⃣ Raw API Streaming (maximum control)

Direct access to the raw API stream format:

```typescript
// For maximum control and custom processing
for await (const rawChunk of client.rawStream({
  messages: [{ role: 'user', content: 'Find transactions for address 0x123...' }],
  vaultId: 'my-vault'
})) {
  // Raw chunks have prefix character and data
  console.log(`Received ${rawChunk.prefix}: ${rawChunk.raw}`);
  
  // Process different prefix types
  switch (rawChunk.prefix) {
    case '0': // Text chunk
      console.log('Text:', rawChunk.data);
      break;
    case '9': // Tool call
      console.log('Tool call:', rawChunk.data);
      break;
    case 'a': // Tool result
      console.log('Tool result:', rawChunk.data);
      break;
    case 'f': // Message ID
      console.log('Message ID:', rawChunk.data.messageId);
      break;
    case '2': // Path info
      console.log('Path info:', rawChunk.data);
      break;
    case 'e': // Completion event
    case 'd': // Final data
      console.log('Finished:', rawChunk.data);
      break;
  }
}
```

## 🛠 Built-in Tools

The Agent Hustle API includes powerful built-in tools that execute automatically on the server. The SDK captures these tool calls and results for you:

### Available Tools

- **Trading & Swaps**: Token swaps, price quotes, limit orders, DCA strategies
- **Liquidity Provision**: Add/remove liquidity, manage LP positions
- **PumpFun Tokens**: Buy, sell, deploy tokens, check graduation status
- **Security & Analysis**: Rugchecks, token audits, holder analysis
- **Wallet Management**: Check balances, transfer tokens, deposit SOL

### Multiple Tool Execution

The API can execute multiple tools in a single conversation. For example, you can ask for trending tokens and a rugcheck in the same request:

```typescript
// Request that uses multiple tools
const response = await client.chat([
  { role: 'user', content: 'Check trending tokens and get token details for the top one' }
], { vaultId: 'my-vault' });

// All tool calls are available in the response
console.log(`Number of tools used: ${response.toolCalls.length}`);

// Access individual tool calls by index or filter by tool name
const rugcheckCalls = response.toolCalls.filter(tool => tool.name === 'rugcheck');
const trendingCalls = response.toolCalls.filter(tool => tool.name === 'birdeye-trending');

// Tool results are also available
console.log('Tool results:', response.toolResults);
```

For streaming interfaces, you can observe multiple tool calls in real-time:

```typescript
for await (const chunk of client.chatStream({ 
  messages: [{ role: 'user', content: 'Check trending tokens and get token details for the top one' }],
  vaultId: 'my-vault',
  processChunks: true 
})) {
  if (chunk.type === 'tool_call') {
    console.log(`Tool called: ${chunk.value.name}`);
    // You can track which tools are being used
  } else if (chunk.type === 'tool_result') {
    console.log(`Tool result received for: ${chunk.value.tool_call_id}`);
    // Match results to their corresponding tool calls
  }
}
```

### Accessing Tool Data

```typescript
// Get a complete response with tool calls and results
const response = await client.chat([
  { role: 'user', content: 'What is the current price of Ethereum?' }
], { vaultId: 'my-vault' });

// Tool calls and results are available in the response
console.log('Tools called:', response.toolCalls);
console.log('Tool results:', response.toolResults);
```

For streaming interfaces, you can observe tool activity in real-time:

```typescript
for await (const chunk of client.chatStream({ 
  messages: [{ role: 'user', content: 'Check the price of SOL in USDC' }],
  vaultId: 'my-vault',
  processChunks: true 
})) {
  if (chunk.type === 'tool_call') {
    console.log('Agent is using tool:', chunk.value.name);
  } else if (chunk.type === 'tool_result') {
    console.log('Tool returned:', chunk.value);
  }
}
```

## 🧪 Testing Your Integration

The SDK supports an override pattern for easy testing without making real API calls:

```typescript
// Mock stream results for testing
const mockResponse = await client.chat(
  [{ role: 'user', content: 'Test message' }],
  { vaultId: 'test-vault' },
  async () => ({ content: 'Mocked response', toolCalls: [] })
);

// Mock stream chunks for testing UI
for await (const chunk of client.chatStream(
  { messages: [...], vaultId: 'test-vault' },
  async function* () {
    yield { type: 'text', value: 'Mocked ' };
    yield { type: 'text', value: 'streaming ' };
    yield { type: 'text', value: 'response' };
    yield { type: 'finish', value: { reason: 'stop' } };
  }
)) {
  // Process mocked chunks in tests
}
```

## 📦 Installation

```bash
npm install emblemvault-hustle-incognito

# or
yarn add emblemvault-hustle-incognito
```

## 🔐 Security

- Never hardcode API keys in your client code
- Use environment variables for sensitive credentials
- For browser applications, proxy requests through your backend

## 📚 API Reference

See our [full documentation](https://docs.emblemvault.ai) for detailed API reference.

## 📄 License

MIT
