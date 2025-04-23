import { describe, test, expect, vi } from 'vitest';
import { HustleIncognitoClient } from '../src';
import type { ProcessedResponse } from '../src/types';

describe('HustleIncognitoClient', () => {
  test('should initialize with required API key', () => {
    const client = new HustleIncognitoClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
  });

  test('should throw error when API key is missing', () => {
    // @ts-ignore - Testing invalid input
    expect(() => new HustleIncognitoClient({})).toThrow('API key is required');
  });

  test('should use default production URL when not specified', () => {
    const client = new HustleIncognitoClient({ apiKey: 'test-key' });
    // @ts-ignore - Accessing private property for testing
    expect(client.baseUrl).toBe('https://agenthustle.ai');
  });

  test('should use custom URL when specified', () => {
    const client = new HustleIncognitoClient({ 
      apiKey: 'test-key',
      hustleApiUrl: 'https://custom-api.example.com'
    });
    // @ts-ignore - Accessing private property for testing
    expect(client.baseUrl).toBe('https://custom-api.example.com');
  });

  test('should prepare correct request body', () => {
    const client = new HustleIncognitoClient({ apiKey: 'test-key' });
    // @ts-ignore - Accessing private method for testing
    const requestBody = client.prepareRequestBody({
      vaultId: 'test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      externalWalletAddress: 'test-wallet'
    });
    
    expect(requestBody).toEqual({
      id: 'chat-test-vault',
      messages: [{ role: 'user', content: 'Hello' }],
      apiKey: 'test-key',
      vaultId: 'test-vault',
      externalWalletAddress: 'test-wallet',
      slippageSettings: { lpSlippage: 5, swapSlippage: 5, pumpSlippage: 5 },
      safeMode: true,
      currentPath: null,
      attachments: []
    });
  });

  test('should use override function when provided', async () => {
    const client = new HustleIncognitoClient({ apiKey: 'test-key' });
    const mockResponse: ProcessedResponse = {
      content: 'Mocked response',
      messageId: 'mock-id',
      toolCalls: [
        { toolCallId: 'tool1', toolName: 'test-tool', args: { param: 'value' } }
      ],
      usage: null,
      pathInfo: null,
      toolResults: []
    };
    
    const overrideFunc = vi.fn().mockResolvedValue(mockResponse);
    
    const result = await client.chat(
      [{ role: 'user', content: 'Hello' }],
      { vaultId: 'test-vault' },
      overrideFunc
    );
    
    expect(overrideFunc).toHaveBeenCalledWith('test-key', {
      messages: [{ role: 'user', content: 'Hello' }],
      vaultId: 'test-vault'
    });
    
    expect(result).toEqual(mockResponse);
  });

  test('should properly parse tool calls from stream chunks', async () => {
    const client = new HustleIncognitoClient({ apiKey: 'test-key' });
    
    // Mock the rawStream method to return predefined chunks
    const mockRawStream = async function* () {
      yield { prefix: '0', data: 'Hello', raw: '0:Hello' };
      yield { 
        prefix: '9', 
        data: { 
          toolCallId: 'tool123', 
          toolName: 'test-tool', 
          args: { param: 'value' } 
        }, 
        raw: '9:{"toolCallId":"tool123","toolName":"test-tool","args":{"param":"value"}}' 
      };
      yield { 
        prefix: 'a', 
        data: { 
          toolCallId: 'tool123', 
          result: { success: true } 
        }, 
        raw: 'a:{"toolCallId":"tool123","result":{"success":true}}' 
      };
      yield { prefix: 'f', data: { messageId: 'msg123' }, raw: 'f:{"messageId":"msg123"}' };
    };
    
    // @ts-ignore - Mocking private method
    client.rawStream = mockRawStream;
    
    const response = await client.chat(
      [{ role: 'user', content: 'Test' }],
      { vaultId: 'test' }
    ) as ProcessedResponse;
    
    expect(response.content).toBe('Hello');
    expect(response.messageId).toBe('msg123');
    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls[0].toolCallId).toBe('tool123');
    expect(response.toolCalls[0].toolName).toBe('test-tool');
    expect(response.toolResults).toHaveLength(1);
    expect(response.toolResults[0].toolCallId).toBe('tool123');
  });
});
