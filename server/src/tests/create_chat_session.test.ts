
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type CreateChatSessionInput, createChatSessionInputSchema } from '../schema';
import { createChatSession } from '../handlers/create_chat_session';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateChatSessionInput = {
  user_id: 'user123',
  websocket_url: 'wss://example.com/ws',
  api_token: 'token_abc123',
  connection_status: 'connecting'
};

describe('createChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a chat session', async () => {
    const result = await createChatSession(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^session_\d+_[a-z0-9]{9}$/);
    expect(result.user_id).toEqual('user123');
    expect(result.websocket_url).toEqual('wss://example.com/ws');
    expect(result.api_token).toEqual('token_abc123');
    expect(result.connection_status).toEqual('connecting');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_activity).toBeInstanceOf(Date);
  });

  it('should save chat session to database', async () => {
    const result = await createChatSession(testInput);

    // Query using proper drizzle syntax
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toEqual(result.id);
    expect(sessions[0].user_id).toEqual('user123');
    expect(sessions[0].websocket_url).toEqual('wss://example.com/ws');
    expect(sessions[0].api_token).toEqual('token_abc123');
    expect(sessions[0].connection_status).toEqual('connecting');
    expect(sessions[0].created_at).toBeInstanceOf(Date);
    expect(sessions[0].last_activity).toBeInstanceOf(Date);
  });

  it('should handle null user_id', async () => {
    const inputWithoutUser: CreateChatSessionInput = {
      websocket_url: 'wss://example.com/ws',
      api_token: 'token_abc123',
      connection_status: 'connecting'
    };

    const result = await createChatSession(inputWithoutUser);

    expect(result.user_id).toBeNull();
    expect(result.websocket_url).toEqual('wss://example.com/ws');
    expect(result.api_token).toEqual('token_abc123');
    expect(result.connection_status).toEqual('connecting');
  });

  it('should use default connection status when not provided', async () => {
    // Parse raw input through Zod to apply defaults
    const rawInput = {
      websocket_url: 'wss://example.com/ws',
      api_token: 'token_abc123'
      // connection_status omitted - should use Zod default 'connecting'
    };

    const parsedInput = createChatSessionInputSchema.parse(rawInput);
    const result = await createChatSession(parsedInput);

    expect(result.connection_status).toEqual('connecting');
  });

  it('should generate unique session IDs', async () => {
    const result1 = await createChatSession(testInput);
    const result2 = await createChatSession(testInput);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).toMatch(/^session_\d+_[a-z0-9]{9}$/);
    expect(result2.id).toMatch(/^session_\d+_[a-z0-9]{9}$/);
  });
});
