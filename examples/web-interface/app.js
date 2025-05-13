// Import the Hustle Incognito client
import { HustleIncognitoClient } from '../../dist/esm/index.js';

// Configuration
const API_KEY = 'b7921b24-5055-46ca-a5bf-c2cccc6da6a4'; // Replace with your API key
const VAULT_ID = '553830330'; // Replace with your vault ID

// Initialize the client
const client = new HustleIncognitoClient({
  apiKey: API_KEY,
  debug: false // Set to true for debugging
});

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Store conversation history
let messages = [];

// Add event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Function to send a message
async function sendMessage() {
  const userMessage = userInput.value.trim();
  
  if (!userMessage) return;
  
  // Clear input
  userInput.value = '';
  
  // Add user message to UI
  addMessageToUI('user', userMessage);
  
  // Add to conversation history
  messages.push({ role: 'user', content: userMessage });
  
  // Show thinking indicator
  const thinkingElement = document.createElement('div');
  thinkingElement.className = 'message bot-message thinking';
  thinkingElement.textContent = 'Agent is thinking';
  const loadingDots = document.createElement('span');
  loadingDots.className = 'loading-dots';
  thinkingElement.appendChild(loadingDots);
  chatMessages.appendChild(thinkingElement);
  
  try {
    // Stream the response
    let fullText = '';
    let toolCalls = [];
    
    for await (const chunk of client.chatStream({
      vaultId: VAULT_ID,
      messages,
      processChunks: true
    })) {
      if ('type' in chunk) {
        switch (chunk.type) {
          case 'text':
            // Remove thinking indicator if this is the first text chunk
            if (!fullText) {
              chatMessages.removeChild(thinkingElement);
              // Create a new message element for the bot
              const botMessageElement = document.createElement('div');
              botMessageElement.className = 'message bot-message';
              botMessageElement.id = 'current-bot-message';
              chatMessages.appendChild(botMessageElement);
            }
            
            fullText += chunk.value;
            document.getElementById('current-bot-message').textContent = fullText;
            break;
            
          case 'tool_call':
            toolCalls.push(chunk.value);
            break;
            
          case 'finish':
            // Remove the ID from the bot message when finished
            const currentBotMessage = document.getElementById('current-bot-message');
            if (currentBotMessage) {
              currentBotMessage.removeAttribute('id');
            }
            break;
        }
      }
    }
    
    // Display tool usage if any
    if (toolCalls.length > 0) {
      let toolsText = 'Tools used:\n';
      toolCalls.forEach((tool, i) => {
        toolsText += `${i+1}. ${tool.toolName || 'Unknown tool'} (ID: ${tool.toolCallId || 'unknown'})\n`;
        if (tool.args) {
          toolsText += `   Args: ${JSON.stringify(tool.args)}\n`;
        }
      });
      
      const toolElement = document.createElement('div');
      toolElement.className = 'message tool-message';
      toolElement.textContent = toolsText;
      chatMessages.appendChild(toolElement);
    }
    
    // Add bot response to history
    if (fullText) {
      messages.push({ role: 'assistant', content: fullText });
    }
  } catch (error) {
    // Remove thinking indicator
    if (chatMessages.contains(thinkingElement)) {
      chatMessages.removeChild(thinkingElement);
    }
    
    // Show error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = `Error: ${error.message}`;
    chatMessages.appendChild(errorElement);
    
    console.error('Error:', error);
  }
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to add a message to the UI
function addMessageToUI(role, content) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${role}-message`;
  messageElement.textContent = content;
  chatMessages.appendChild(messageElement);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add a welcome message
addMessageToUI('bot', 'Welcome to Hustle Incognito Chat! Ask about Solana tokens, trading, or anything crypto-related.');
