# Emblem Vault Hustle Incognito SDK - Developer Guide

This document provides comprehensive information for developers working with the Emblem Vault Hustle Incognito SDK, including development workflows, publishing procedures, and integration guidelines.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Build System](#build-system)
- [Testing](#testing)
- [Debugging](#debugging)
- [Version Management](#version-management)
- [Publishing to npm](#publishing-to-npm)
- [Integration Guide for Consumers](#integration-guide-for-consumers)
- [Advanced Usage](#advanced-usage)

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/EmblemCompany/emblemvault-hustle-incognito.git
   cd emblemvault-hustle-incognito
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API key and other settings
   ```

## Project Structure

```
emblemvault-hustle-incognito/
├── dist/               # Built output (generated)
│   ├── cjs/            # CommonJS format
│   └── esm/            # ES Modules format
├── src/                # Source code
│   ├── client.ts       # Main client implementation
│   ├── types.ts        # TypeScript type definitions
│   └── index.ts        # Entry point and exports
├── examples/           # Usage examples
│   └── simple-cli.js   # Simple CLI example
├── tests/              # Test files
│   ├── client.test.ts  # Unit tests
│   └── integration.test.ts # Integration tests
├── .env.example        # Example environment variables
├── package.json        # Project metadata and scripts
├── tsconfig.json       # TypeScript configuration
├── README.md           # User-facing documentation
└── DEVELOPER.md        # This developer guide
```

## Build System

The SDK uses a dual package approach, supporting both CommonJS and ES Modules formats.

### Available Build Scripts

| Script | Description |
|--------|-------------|
| `npm run build:esm` | Builds ES Modules version |
| `npm run build:cjs` | Builds CommonJS version |
| `npm run build` | Builds both formats (runs both scripts above) |
| `npm run clean` | Removes the dist directory |
| `npm run prebuild` | Automatically runs before build (cleans dist) |

The build process:
1. Cleans the `dist` directory (via `prebuild`)
2. Compiles TypeScript to JavaScript for ESM
3. Compiles TypeScript to JavaScript for CommonJS
4. Generates type definitions (.d.ts files)

### Dual Package Pattern

The SDK uses the "exports" field in package.json to support both module systems:

```json
"exports": {
  ".": {
    "import": {
      "types": "./dist/esm/index.d.ts",
      "default": "./dist/esm/index.js"
    },
    "require": {
      "types": "./dist/cjs/index.d.ts",
      "default": "./dist/cjs/index.js"
    }
  }
}
```

This ensures that:
- `import` statements use the ESM version
- `require()` calls use the CommonJS version
- TypeScript types are available for both

## Testing

The SDK uses Vitest for testing.

### Available Test Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Runs all tests once |
| `npm run test:watch` | Runs tests in watch mode |

### Test Types

1. **Unit Tests** (`tests/client.test.ts`)
   - Tests individual components in isolation
   - Fast and focused on specific functionality

2. **Integration Tests** (`tests/integration.test.ts`)
   - Tests interaction with the live API
   - Requires valid credentials in .env
   - Skipped in CI environments

### Override Pattern

The SDK implements an override pattern for testing, allowing you to mock API responses:

```typescript
// In tests
const mockResponse = { content: 'test', messageId: 'id123' };
const overrideFunc = async () => mockResponse;
const result = await client.chat(messages, options, overrideFunc);
```

## Debugging

The SDK includes comprehensive debugging capabilities.

### Debug Modes

1. **Environment Variable**: Set `DEBUG=true` in .env
2. **Command Line Flag**: Use `--debug` with the CLI example

### Debug Scripts

| Script | Description |
|--------|-------------|
| `npm run example:cli` | Runs CLI example without debug |
| `npm run example:cli:debug` | Runs CLI example with debug enabled |

### Debug Output

Debug mode provides timestamped logs for:
- SDK initialization
- Request preparation
- API communication
- Stream processing
- Tool calls and results

Example:
```
[2025-04-23T06:37:26.484Z] Emblem Vault Hustle Incognito SDK v0.1.0
[2025-04-23T06:37:26.484Z] Using API endpoint: https://agenthustle.ai
```

## Version Management

The SDK follows semantic versioning (MAJOR.MINOR.PATCH).

### Version Scripts

| Script | Description |
|--------|-------------|
| `npm version patch` | Bumps patch version (1.0.0 → 1.0.1) |
| `npm version minor` | Bumps minor version (1.0.0 → 1.1.0) |
| `npm version major` | Bumps major version (1.0.0 → 2.0.0) |

### Version Workflow

When running `npm version`:

1. **`preversion`**: Runs linting to ensure code quality
2. **Version bump**: Updates version in package.json
3. **`version`**: Formats code and stages changes
4. **`postversion`**: Pushes changes and tags to remote

Example workflow:
```bash
# Fix a bug
git add .
git commit -m "fix: resolved issue with API endpoint"

# Bump patch version, lint, tag, and push
npm version patch -m "Bump version to %s"
```

## Publishing to npm

### Preparation

1. Ensure you have an npm account and are logged in:
   ```bash
   npm login
   ```

2. Make sure you have proper access to the @emblemcompany organization:
   ```bash
   npm access ls-packages
   ```

### Publishing Process

The SDK has several safeguards to ensure quality when publishing:

1. **`prepublishOnly`**: Automatically runs tests and linting
2. **`prepare`**: Builds the package

To publish:
```bash
# Bump version first (see Version Management)
npm version patch

# Publish to npm
npm publish
```

### Publishing Options

- **Public package**:
  ```bash
  npm publish --access public
  ```

- **Beta/Release Candidate**:
  ```bash
  # Tag as beta
  npm version 1.0.0-beta.1
  npm publish --tag beta
  ```

## Integration Guide for Consumers

### Installation

```bash
npm install emblemvault-hustle-incognito
```

### Basic Usage

```javascript
// ESM
import { HustleIncognitoClient } from 'emblemvault-hustle-incognito';

// CommonJS
const { HustleIncognitoClient } = require('emblemvault-hustle-incognito');

// Initialize
const client = new HustleIncognitoClient({
  apiKey: 'your-api-key'
});

// Use
const response = await client.chat([
  { role: 'user', content: 'Show me trending Solana tokens' }
]);
```

### Environment Setup for Consumers

Consumers should set up their environment variables:

```
HUSTLE_API_KEY=your_api_key_here
VAULT_ID=your_vault_id (optional)
```

### TypeScript Support

The SDK includes full TypeScript definitions:

```typescript
import { HustleIncognitoClient, ChatMessage } from 'emblemvault-hustle-incognito';

const messages: ChatMessage[] = [
  { role: 'user', content: 'Hello' }
];
```

## Advanced Usage

### Override Pattern for Consumers

Consumers can use the override pattern for custom implementations:

```javascript
const customImplementation = async (apiKey, options) => {
  // Custom logic here
  return { content: 'Custom response' };
};

const response = await client.chat(
  messages,
  { vaultId: 'custom' },
  customImplementation
);
```

### Streaming Responses

```javascript
// Process chunks as they arrive
for await (const chunk of client.chatStream({ 
  messages, 
  vaultId: 'default' 
})) {
  if (chunk.type === 'text') {
    console.log(chunk.value);
  }
}
```

### Tool Calls

The SDK automatically captures tool calls from the API:

```javascript
const response = await client.chat(messages);

if (response.toolCalls && response.toolCalls.length > 0) {
  console.log('Tools used:', response.toolCalls);
}
```

---

This developer guide is maintained alongside the SDK. For user-facing documentation, see [README.md](./README.md).
