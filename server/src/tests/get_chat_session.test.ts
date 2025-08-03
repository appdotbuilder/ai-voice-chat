
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type CreateChatSessionInput } from '../schema';
import { getChatSession } from '../handlers/get_chat_session';

// Test session input
const testSessionInput: CreateChatSessionInput = {
  user_id: 'user-123',
  websocket_url: 'wss://example.com/websocket',
  api_token: 'test-api-token-123',
  connection_status: 'connected'
};

describe('getChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve an existing chat session', async () => {
    // Create a test session first
    const insertResult = await db.insert(chatSessionsTable)
      .values({
        id: 'session-123',
        user_id: testSessionInput.user_id,
        websocket_url: testSessionInput.websocket_url,
        api_token: testSessionInput.api_token,
        connection_status: testSessionInput.connection_status
      })
      .returning()
      .execute();

    const createdSession = insertResult[0];

    // Retrieve the session
    const result = await getChatSession('session-123');

    expect(result).toBeDefined();
    expect(result!.id).toEqual('session-123');
    expect(result!.user_id).toEqual('user-123');
    expect(result!.websocket_url).toEqual('wss://example.com/websocket');
    expect(result!.api_token).toEqual('test-api-token-123');
    expect(result!.connection_status).toEqual('connected');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.last_activity).toBeInstanceOf(Date);
  });

  it('should return null for non-existent session', async () => {
    const result = await getChatSession('non-existent-session');

    expect(result).toBeNull();
  });

  it('should retrieve session with different connection statuses', async () => {
    // Create sessions with different statuses
    await db.insert(chatSessionsTable)
      .values([
        {
          id: 'session-connecting',
          user_id: 'user-1',
          websocket_url: 'wss://example.com/ws1',
          api_token: 'token-1',
          connection_status: 'connecting'
        },
        {
          id: 'session-disconnected',
          user_id: 'user-2',
          websocket_url: 'wss://example.com/ws2',
          api_token: 'token-2',
          connection_status: 'disconnected'
        },
        {
          id: 'session-error',
          user_id: 'user-3',
          websocket_url: 'wss://example.com/ws3',
          api_token: 'token-3',
          connection_status: 'error'
        }
      ])
      .execute();

    // Test each status
    const connectingSession = await getChatSession('session-connecting');
    expect(connectingSession!.connection_status).toEqual('connecting');

    const disconnectedSession = await getChatSession('session-disconnected');
    expect(disconnectedSession!.connection_status).toEqual('disconnected');

    const errorSession = await getChatSession('session-error');
    expect(errorSession!.connection_status).toEqual('error');
  });

  it('should retrieve session with null user_id', async () => {
    // Create session without user_id
    await db.insert(chatSessionsTable)
      .values({
        id: 'session-no-user',
        user_id: null,
        websocket_url: 'wss://example.com/anonymous',
        api_token: 'anonymous-token',
        connection_status: 'connected'
      })
      .execute();

    const result = await getChatSession('session-no-user');

    expect(result).toBeDefined();
    expect(result!.id).toEqual('session-no-user');
    expect(result!.user_id).toBeNull();
    expect(result!.websocket_url).toEqual('wss://example.com/anonymous');
    expect(result!.api_token).toEqual('anonymous-token');
    expect(result!.connection_status).toEqual('connected');
  });
});
