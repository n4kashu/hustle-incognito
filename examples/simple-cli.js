#!/usr/bin/env node

// Use dynamic import for compatibility with both ESM and CommonJS
async function main() {
  try {
    // Import dependencies
    const { HustleIncognitoClient } = await import('../dist/esm/index.js');
    const dotenv = await import('dotenv');
    const readline = await import('readline');
    
    // Load environment variables
    dotenv.config();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const debugMode = args.includes('--debug');
    
    // Check for required environment variables
    const API_KEY = process.env.HUSTLE_API_KEY;
    const VAULT_ID = process.env.VAULT_ID || 'default';
    
    if (!API_KEY) {
      console.error('Error: HUSTLE_API_KEY environment variable is required');
      console.error('Please create a .env file with your API key or set it in your environment');
      process.exit(1);
    }
    
    // Initialize the client
    const client = new HustleIncognitoClient({
      apiKey: API_KEY,
      debug: debugMode || process.env.DEBUG === 'true'
    });
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Store conversation history
    const messages = [];
    
    // Main chat function
    async function chat() {
      rl.question('\nYou: ', async (input) => {
        // Exit condition
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }
        
        // Add user message to history
        messages.push({ role: 'user', content: input });
        
        console.log('\nAgent is thinking...');
        
        try {
          // Get response from the AI
          const response = await client.chat(
            messages,
            { vaultId: VAULT_ID }
          );
          
          console.log(`\nAgent: ${response.content}`);
          
          // Log tool usage if any
          if (response.toolCalls && response.toolCalls.length > 0) {
            console.log('\nTools used:');
            response.toolCalls.forEach((tool, i) => {
              console.log(`${i+1}. ${tool.toolName || 'Unknown tool'} (ID: ${tool.toolCallId || 'unknown'})`);
              if (tool.args) {
                console.log(`   Args: ${JSON.stringify(tool.args)}`);
              }
            });
          }
          
          // Add assistant response to history
          messages.push({ role: 'assistant', content: response.content });
          
          // Continue the conversation
          chat();
        } catch (error) {
          console.error('Error:', error.message);
          chat();
        }
      });
    }
    
    // Start the chat
    console.log('Welcome to Emblem Vault Hustle Incognito CLI!');
    console.log('Ask about Solana tokens, trading, or anything crypto-related.');
    console.log('Type "exit" or "quit" to end the conversation.\n');
    if (debugMode) {
      console.log('[DEBUG MODE ENABLED] - Timestamps will be shown with debug information\n');
    }
    chat();
  } catch (error) {
    console.error('Error initializing CLI:', error);
  }
}

// Run the main function
main();
