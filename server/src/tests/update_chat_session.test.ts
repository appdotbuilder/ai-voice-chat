
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type CreateChatSessionInput, type UpdateChatSessionInput } from '../schema';
import { updateChatSession } from '../handlers/update_chat_session';
import { eq } from 'drizzle-orm';

// Test data
const testSessionInput: CreateChatSessionInput = {
  user_id: 'test-user-123',
  websocket_url: 'ws://example.com/chat',
  api_token: 'test-api-token-123',
  connection_status: 'connecting'
};

describe('updateChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update connection status', async () => {
    // Create a test session first
    const createdSession = await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-123',
        ...testSessionInput
      })
      .returning()
      .execute();

    const sessionId = createdSession[0].id;

    // Update the connection status
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      connection_status: 'connected'
    };

    const result = await updateChatSession(updateInput);

    // Verify the update
    expect(result.id).toEqual(sessionId);
    expect(result.connection_status).toEqual('connected');
    expect(result.user_id).toEqual('test-user-123');
    expect(result.websocket_url).toEqual('ws://example.com/chat');
    expect(result.api_token).toEqual('test-api-token-123');
  });

  it('should update last activity timestamp', async () => {
    // Create a test session first
    const createdSession = await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-456',
        ...testSessionInput
      })
      .returning()
      .execute();

    const sessionId = createdSession[0].id;
    const newTimestamp = new Date('2024-01-15T10:30:00Z');

    // Update the last activity
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      last_activity: newTimestamp
    };

    const result = await updateChatSession(updateInput);

    // Verify the update
    expect(result.id).toEqual(sessionId);
    expect(result.last_activity).toEqual(newTimestamp);
    expect(result.connection_status).toEqual('connecting'); // Should remain unchanged
  });

  it('should update both connection status and last activity', async () => {
    // Create a test session first
    const createdSession = await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-789',
        ...testSessionInput
      })
      .returning()
      .execute();

    const sessionId = createdSession[0].id;
    const newTimestamp = new Date('2024-01-15T15:45:00Z');

    // Update both fields
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      connection_status: 'error',
      last_activity: newTimestamp
    };

    const result = await updateChatSession(updateInput);

    // Verify both updates
    expect(result.id).toEqual(sessionId);
    expect(result.connection_status).toEqual('error');
    expect(result.last_activity).toEqual(newTimestamp);
    expect(result.user_id).toEqual('test-user-123'); // Should remain unchanged
  });

  it('should save updates to database', async () => {
    // Create a test session first
    const createdSession = await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-persist',
        ...testSessionInput
      })
      .returning()
      .execute();

    const sessionId = createdSession[0].id;

    // Update the session
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      connection_status: 'disconnected'
    };

    await updateChatSession(updateInput);

    // Verify the data was saved to database
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].connection_status).toEqual('disconnected');
    expect(sessions[0].user_id).toEqual('test-user-123');
  });

  it('should throw error for non-existent session', async () => {
    const updateInput: UpdateChatSessionInput = {
      id: 'non-existent-session',
      connection_status: 'connected'
    };

    await expect(updateChatSession(updateInput)).rejects.toThrow(/not found/i);
  });
});
