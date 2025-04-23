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
    const initialDebugMode = args.includes('--debug');
    const initialStreamMode = args.includes('--stream');
    
    // Check for required environment variables
    const API_KEY = process.env.HUSTLE_API_KEY;
    const VAULT_ID = process.env.VAULT_ID || 'default';
    const ENV_DEBUG = process.env.DEBUG === 'true';
    
    if (!API_KEY) {
      console.error('Error: HUSTLE_API_KEY environment variable is required');
      console.error('Please create a .env file with your API key or set it in your environment');
      process.exit(1);
    }
    
    // Settings that can be toggled during runtime
    let settings = {
      debug: initialDebugMode || ENV_DEBUG,
      stream: initialStreamMode
    };
    
    // Initialize the client
    let client = new HustleIncognitoClient({
      apiKey: API_KEY,
      debug: settings.debug
    });
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Store conversation history
    const messages = [];
    
    // Controller for aborting streams
    let controller = null;
    
    // Handle user input during streaming
    const setupInputListener = () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.on('data', (data) => {
          // If any key is pressed during streaming and we have an active controller
          if (controller) {
            // Abort the stream
            controller.abort();
            controller = null;
            
            // Reset stdin mode
            process.stdin.setRawMode(false);
            process.stdin.removeAllListeners('data');
            
            console.log('\n\n[Stream interrupted by user]');
          }
        });
      }
    };
    
    // Cleanup input listener
    const cleanupInputListener = () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.removeAllListeners('data');
      }
    };
    
    // Stream the response from the API
    async function streamResponse(messages) {
      let fullText = '';
      let toolCalls = [];
      
      process.stdout.write('\nAgent: ');
      
      // Create abort controller for this stream
      controller = new AbortController();
      const signal = controller.signal;
      
      // Setup input listener to allow interrupting the stream
      setupInputListener();
      
      try {
        for await (const chunk of client.chatStream({
          vaultId: VAULT_ID,
          messages,
          processChunks: true,
          signal
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
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('\n[Stream aborted]');
        } else {
          console.error(`\nError during streaming: ${error.message}`);
        }
      } finally {
        // Clean up the input listener
        cleanupInputListener();
        controller = null;
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
    
    // Display help information
    function showHelp() {
      console.log('\nAvailable commands:');
      console.log('  /help           - Show this help message');
      console.log('  /exit, /quit    - Exit the application');
      console.log('  /stream on|off  - Enable or disable streaming mode');
      console.log('  /debug on|off   - Enable or disable debug mode');
      console.log('  /settings       - Show current settings');
      console.log('\nDuring streaming:');
      console.log('  Press any key to interrupt the stream');
    }
    
    // Show current settings
    function showSettings() {
      console.log('\nCurrent settings:');
      console.log(`  Streaming: ${settings.stream ? 'ON' : 'OFF'}`);
      console.log(`  Debug:     ${settings.debug ? 'ON' : 'OFF'}`);
      console.log(`  Vault ID:  ${VAULT_ID}`);
    }
    
    // Process commands
    function processCommand(input) {
      const command = input.trim().toLowerCase();
      
      if (command === '/help') {
        showHelp();
        return true;
      }
      
      if (command === '/exit' || command === '/quit') {
        console.log('Goodbye!');
        rl.close();
        return true;
      }
      
      if (command === '/settings') {
        showSettings();
        return true;
      }
      
      if (command.startsWith('/stream')) {
        const parts = command.split(' ');
        if (parts.length === 2) {
          if (parts[1] === 'on') {
            settings.stream = true;
            console.log('Streaming mode enabled');
          } else if (parts[1] === 'off') {
            settings.stream = false;
            console.log('Streaming mode disabled');
          } else {
            console.log(`Invalid option: ${parts[1]}. Use 'on' or 'off'`);
          }
        } else {
          console.log(`Streaming is currently ${settings.stream ? 'ON' : 'OFF'}`);
        }
        return true;
      }
      
      if (command.startsWith('/debug')) {
        const parts = command.split(' ');
        if (parts.length === 2) {
          if (parts[1] === 'on') {
            settings.debug = true;
            // Reinitialize client with new debug setting
            client = new HustleIncognitoClient({
              apiKey: API_KEY,
              debug: true
            });
            console.log('Debug mode enabled');
          } else if (parts[1] === 'off') {
            settings.debug = false;
            // Reinitialize client with new debug setting
            client = new HustleIncognitoClient({
              apiKey: API_KEY,
              debug: false
            });
            console.log('Debug mode disabled');
          } else {
            console.log(`Invalid option: ${parts[1]}. Use 'on' or 'off'`);
          }
        } else {
          console.log(`Debug is currently ${settings.debug ? 'ON' : 'OFF'}`);
        }
        return true;
      }
      
      return false;
    }
    
    // Main chat function
    async function chat() {
      rl.question('\nYou: ', async (input) => {
        // Check if the input is a command
        if (input.startsWith('/')) {
          const isCommand = processCommand(input);
          if (isCommand) {
            chat();
            return;
          }
        }
        
        // Exit condition (handled by processCommand, but kept for compatibility)
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }
        
        // Add user message to history
        messages.push({ role: 'user', content: input });
        
        if (!settings.stream) {
          console.log('\nAgent is thinking...');
        }
        
        try {
          let assistantResponse;
          
          if (settings.stream) {
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
    console.log('Type "/help" to see available commands or "/exit" to end the conversation.\n');
    
    // Show initial settings
    if (settings.debug) {
      console.log('[DEBUG MODE ENABLED] - Timestamps will be shown with debug information');
    }
    
    if (settings.stream) {
      console.log('[STREAM MODE ENABLED] - Responses will be streamed in real-time');
    }
    
    console.log(''); // Empty line for better spacing
    showSettings();
    chat();
  } catch (error) {
    console.error('Error initializing CLI:', error);
  }
}

// Run the main function
main();
