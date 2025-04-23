// src/client.ts
import type {
  HustleIncognitoClientOptions,
  ChatMessage,
  StreamChunk,
  // Used in type definitions only
  HustleRequest,
  StreamOptions,
  ProcessedResponse,
  RawChunk
} from './types';

// Define SDK version manually until we can properly import from package.json
const SDK_VERSION = '0.1.0';

// Default API endpoints
const API_ENDPOINTS = {
  PRODUCTION: 'https://api.emblemvault.ai',
  STAGING: 'https://staging-api.emblemvault.ai',
  LOCAL: 'http://localhost:3000'
};

/**
 * Client for interacting with the Emblem Vault Hustle Incognito Agent API.
 */
export class HustleIncognitoClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly userKey?: string;
  private readonly userSecret?: string;
  private readonly sdkVersion: string = SDK_VERSION;
  private readonly fetchImpl: typeof fetch;
  private readonly debug: boolean;

  /**
   * Creates an instance of HustleIncognitoClient.
   * @param options - Configuration options for the client.
   */
  constructor(options: HustleIncognitoClientOptions) {
    if (!options.apiKey) {
      throw new Error('API key is required.');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.hustleApiUrl || API_ENDPOINTS.PRODUCTION;
    this.userKey = options.userKey;
    this.userSecret = options.userSecret;
    this.fetchImpl = options.fetch || fetch;
    this.debug = options.debug || false;
    
    // Debug info
    if (this.debug) {
      console.log(`Emblem Vault Hustle Incognito SDK v${this.sdkVersion}`);
      console.log(`Using API endpoint: ${this.baseUrl}`);
    }
  }

  /**
   * Sends a chat message or conversation history to the API and gets a response.
   * Handles non-streaming responses.
   *
   * @param messages - An array of chat messages representing the conversation history.
   * @param options - Optional parameters like vaultId, userApiKey, etc.
   * @param overrideFunc - Optional function to override the API call (useful for testing)
   * @returns A promise resolving to the API response or an API error.
   */
  public async chat(
    messages: ChatMessage[],
    options: {
      vaultId: string;
      userApiKey?: string;
      externalWalletAddress?: string;
      slippageSettings?: Record<string, number>;
      safeMode?: boolean;
      rawResponse?: boolean;
    } = { vaultId: 'default' },
    overrideFunc: Function | null = null
  ): Promise<ProcessedResponse | RawChunk[]> {
    // Implement override pattern
    if (overrideFunc && typeof overrideFunc === 'function') {
      return await overrideFunc(this.apiKey, { messages, ...options });
    }
    
    // Default implementation
    if (options.rawResponse) {
      // Return the raw chunks
      const chunks: RawChunk[] = [];
      for await (const chunk of this.rawStream({
        vaultId: options.vaultId,
        messages,
        userApiKey: options.userApiKey,
        externalWalletAddress: options.externalWalletAddress,
        slippageSettings: options.slippageSettings,
        safeMode: options.safeMode
      })) {
        chunks.push(chunk as RawChunk);
      }
      return chunks;
    }
    
    // Process and collect the response
    let fullText = '';
    let messageId = null;
    let usage = null;
    let pathInfo = null;
    const toolCalls: any[] = [];
    const toolResults: any[] = [];

    for await (const chunk of this.chatStream({ 
      vaultId: options.vaultId,
      messages,
      userApiKey: options.userApiKey,
      externalWalletAddress: options.externalWalletAddress,
      slippageSettings: options.slippageSettings,
      safeMode: options.safeMode,
      processChunks: true
    })) {
      if ('type' in chunk) {
        switch (chunk.type) {
          case 'text':
            fullText += chunk.value as string;
            break;
          case 'message_id':
            messageId = chunk.value as string;
            break;
          case 'finish':
            if (chunk.value && typeof chunk.value === 'object' && 'usage' in chunk.value) {
              usage = chunk.value.usage;
            }
            break;
          case 'path_info':
            pathInfo = chunk.value;
            break;
          case 'tool_call':
            toolCalls.push(chunk.value);
            break;
          case 'tool_result':
            toolResults.push(chunk.value);
            break;
        }
      }
    }

    return {
      content: fullText,
      messageId,
      usage,
      pathInfo,
      toolCalls,
      toolResults
    };
  }

  /**
   * Sends a chat message or conversation history and streams the response.
   *
   * @param options - Chat configuration including messages, vaultId, etc.
   * @param overrideFunc - Optional function to override the API call (useful for testing)
   * @returns An async iterable yielding StreamChunk objects or throwing an ApiError.
   */
  public async *chatStream(
    options: StreamOptions,
    overrideFunc: Function | null = null
  ): AsyncIterable<StreamChunk | RawChunk> {
    // Implement override pattern
    if (overrideFunc && typeof overrideFunc === 'function') {
      // For custom stream handling, yield generator from override function
      yield* overrideFunc(this.apiKey, options);
      return;
    }
    
    // If we're not processing chunks, just use rawStream
    if (options.processChunks === false) {
      yield* this.rawStream(options);
      return;
    }

    // Otherwise, process chunks into structured data
    for await (const chunk of this.rawStream(options)) {
      switch (chunk.prefix) {
        case '0': // Text chunk
          yield { type: 'text', value: chunk.data };
          break;
        
        case '9': // Tool call
          yield { type: 'tool_call', value: chunk.data };
          break;
          
        case 'a': // Tool result
          yield { type: 'tool_result', value: chunk.data };
          break;
          
        case 'f': // Message ID
          if (chunk.data && typeof chunk.data === 'object' && 'messageId' in chunk.data) {
            yield { type: 'message_id', value: chunk.data.messageId };
          }
          break;
          
        case 'e': // Completion event
        case 'd': // Final data
          yield { 
            type: 'finish', 
            value: { 
              reason: chunk.data?.finishReason || 'stop',
              usage: chunk.data?.usage
            } 
          };
          break;
          
        case '2': // Path info
          try {
            if (Array.isArray(chunk.data) && chunk.data.length > 0) {
              yield { type: 'path_info', value: chunk.data[0] };
            } else {
              yield { type: 'path_info', value: chunk.data };
            }
          } catch (error) {
            if (this.debug) console.error('Error processing path info:', error);
          }
          break;
          
        default:
          // Unknown chunk type, just pass it through
          yield { type: 'unknown', value: chunk };
      }
    }
  }

  /**
   * Low-level function that provides direct access to the raw stream chunks.
   * This is a passthrough mode where processing is left to the consumer.
   * 
   * @param options - Chat configuration including messages, vaultId, etc.
   * @param overrideFunc - Optional function to override the API call (useful for testing)
   * @returns An async iterable of raw chunks from the API
   */
  public async *rawStream(
    options: {
      vaultId: string;
      messages: ChatMessage[];
      userApiKey?: string;
      externalWalletAddress?: string;
      slippageSettings?: Record<string, number>;
      safeMode?: boolean;
      currentPath?: string | null;
    },
    overrideFunc: Function | null = null
  ): AsyncIterable<RawChunk> {
    // Implement override pattern
    if (overrideFunc && typeof overrideFunc === 'function') {
      // For custom stream handling, yield generator from override function
      yield* overrideFunc(this.apiKey, options);
      return;
    }
    
    const requestBody = this.prepareRequestBody(options);
    
    try {
      const response = await this.createRequest(requestBody);
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream reader not available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const prefix = line.charAt(0);
            const data = line.substring(2);
            
            // Parse JSON if it's valid JSON, otherwise leave as string
            let parsedData;
            try {
              parsedData = JSON.parse(data);
            } catch (e) {
              parsedData = data;
            }
            
            yield { prefix, data: parsedData, raw: line };
          } catch (error) {
            if (this.debug) console.error('Error parsing stream chunk:', error);
            yield { prefix: 'error', data: line, raw: line };
          }
        }
      }
    } catch (error) {
      if (this.debug) console.error('Error in rawStream:', error);
      yield { prefix: 'error', data: String(error), raw: String(error) };
      throw error;
    }
  }

  /**
   * Prepares the request body for a chat request
   * @private
   */
  private prepareRequestBody(options: {
    vaultId: string;
    messages: ChatMessage[];
    userApiKey?: string;
    externalWalletAddress?: string;
    slippageSettings?: Record<string, number>;
    safeMode?: boolean;
    currentPath?: string | null;
  }): HustleRequest {
    const apiKey = options.userApiKey || this.apiKey;
    if (!apiKey) {
      throw new Error('API key is required');
    }

    return {
      id: `chat-${options.vaultId}`,
      messages: options.messages,
      apiKey,
      vaultId: options.vaultId,
      externalWalletAddress: options.externalWalletAddress || '',
      slippageSettings: options.slippageSettings || { lpSlippage: 5, swapSlippage: 5, pumpSlippage: 5 },
      safeMode: options.safeMode !== false,
      currentPath: options.currentPath || null,
      attachments: []
    };
  }

  /**
   * Creates a fetch request to the chat API
   * @private
   */
  private async createRequest(requestBody: HustleRequest): Promise<Response> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Constructs the necessary headers for API requests.
   * @private
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `HustleIncognito-SDK/${this.sdkVersion}`
    };
    
    // Note: API key goes in the request body for this API, not in headers
    
    if (this.userKey) {
      headers['X-User-Key'] = this.userKey;
      if (this.userSecret) {
        headers['X-User-Secret'] = this.userSecret;
      }
    }
    return headers;
  }
}
