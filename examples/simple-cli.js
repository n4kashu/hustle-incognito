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
    const streamMode = args.includes('--stream');
    
    // Check for required environment variables
    const API_KEY = process.env.HUSTLE_API_KEY;
    const VAULT_ID = process.env.VAULT_ID || 'default';
    const DEBUG = process.env.DEBUG === 'true';
    
    if (!API_KEY) {
      console.error('Error: HUSTLE_API_KEY environment variable is required');
      console.error('Please create a .env file with your API key or set it in your environment');
      process.exit(1);
    }
    
    // Initialize the client
    const client = new HustleIncognitoClient({
      apiKey: API_KEY,
      debug: debugMode || DEBUG
    });
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Store conversation history
    const messages = [];
    
    // Stream the response from the API
    async function streamResponse(messages) {
      let fullText = '';
      let toolCalls = [];
      
      process.stdout.write('\nAgent: ');
      
      for await (const chunk of client.chatStream({
        vaultId: VAULT_ID,
        messages,
        processChunks: true
      })) {
        if ('type' in chunk) {
          switch (chunk.type) {
            case 'text':
              process.stdout.write(chunk.value);
              fullText += chunk.value;
              break;
              
            case 'tool_call':
              toolCalls.push(chunk.value);
              break;
              
            case 'finish':
              process.stdout.write('\n');
              break;
          }
        }
      }
      
      // Log tool usage if any
      if (toolCalls.length > 0) {
        console.log('\nTools used:');
        toolCalls.forEach((tool, i) => {
          console.log(`${i+1}. ${tool.toolName || 'Unknown tool'} (ID: ${tool.toolCallId || 'unknown'})`);
          if (tool.args) {
            console.log(`   Args: ${JSON.stringify(tool.args)}`);
          }
        });
      }
      
      return fullText;
    }
    
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
        
        if (!streamMode) {
          console.log('\nAgent is thinking...');
        }
        
        try {
          let assistantResponse;
          
          if (streamMode) {
            // Stream the response
            assistantResponse = await streamResponse(messages);
          } else {
            // Get response from the AI (non-streaming)
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
            
            assistantResponse = response.content;
          }
          
          // Add assistant response to history
          messages.push({ role: 'assistant', content: assistantResponse });
          
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
    
    if (debugMode || DEBUG) {
      console.log('[DEBUG MODE ENABLED] - Timestamps will be shown with debug information');
    }
    
    if (streamMode) {
      console.log('[STREAM MODE ENABLED] - Responses will be streamed in real-time');
    }
    
    console.log(''); // Empty line for better spacing
    chat();
  } catch (error) {
    console.error('Error initializing CLI:', error);
  }
}

// Run the main function
main();
