
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable, chatMessagesTable, audioRecordingsTable } from '../db/schema';
import { type CreateChatSessionInput, type CreateChatMessageInput, type CreateAudioRecordingInput } from '../schema';
import { deleteChatSession } from '../handlers/delete_chat_session';
import { eq } from 'drizzle-orm';

// Test data
const testSessionInput: CreateChatSessionInput = {
  websocket_url: 'wss://example.com/ws',
  api_token: 'test-token-123',
  user_id: 'user-123',
  connection_status: 'connected'
};

const testMessageInput: CreateChatMessageInput = {
  session_id: 'test-session-1',
  message_type: 'user_text',
  content: 'Hello world',
  transcription: null,
  audio_duration: null
};

const testAudioInput: CreateAudioRecordingInput = {
  session_id: 'test-session-1',
  file_path: '/path/to/audio.wav',
  duration: 5.5,
  sample_rate: 44100,
  channels: 2,
  format: 'wav',
  file_size: 1024000
};

describe('deleteChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a chat session successfully', async () => {
    // Create test session
    await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-1',
        ...testSessionInput
      })
      .execute();

    const result = await deleteChatSession('test-session-1');

    expect(result.success).toBe(true);

    // Verify session is deleted
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, 'test-session-1'))
      .execute();

    expect(sessions).toHaveLength(0);
  });

  it('should return false for non-existent session', async () => {
    const result = await deleteChatSession('non-existent-session');

    expect(result.success).toBe(false);
  });

  it('should delete session with associated messages', async () => {
    // Create test session
    await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-1',
        ...testSessionInput
      })
      .execute();

    // Create test message - convert numeric field to string
    await db.insert(chatMessagesTable)
      .values({
        ...testMessageInput,
        audio_duration: testMessageInput.audio_duration?.toString() || null
      })
      .execute();

    const result = await deleteChatSession('test-session-1');

    expect(result.success).toBe(true);

    // Verify session is deleted
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, 'test-session-1'))
      .execute();

    expect(sessions).toHaveLength(0);

    // Verify messages are deleted
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, 'test-session-1'))
      .execute();

    expect(messages).toHaveLength(0);
  });

  it('should delete session with associated audio recordings', async () => {
    // Create test session
    await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-1',
        ...testSessionInput
      })
      .execute();

    // Create test audio recording
    await db.insert(audioRecordingsTable)
      .values({
        ...testAudioInput,
        duration: testAudioInput.duration.toString() // Convert numeric field
      })
      .execute();

    const result = await deleteChatSession('test-session-1');

    expect(result.success).toBe(true);

    // Verify session is deleted
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, 'test-session-1'))
      .execute();

    expect(sessions).toHaveLength(0);

    // Verify audio recordings are deleted
    const recordings = await db.select()
      .from(audioRecordingsTable)
      .where(eq(audioRecordingsTable.session_id, 'test-session-1'))
      .execute();

    expect(recordings).toHaveLength(0);
  });

  it('should delete session with both messages and audio recordings', async () => {
    // Create test session
    await db.insert(chatSessionsTable)
      .values({
        id: 'test-session-1',
        ...testSessionInput
      })
      .execute();

    // Create test message - convert numeric field to string
    await db.insert(chatMessagesTable)
      .values({
        ...testMessageInput,
        audio_duration: testMessageInput.audio_duration?.toString() || null
      })
      .execute();

    // Create test audio recording
    await db.insert(audioRecordingsTable)
      .values({
        ...testAudioInput,
        duration: testAudioInput.duration.toString() // Convert numeric field
      })
      .execute();

    const result = await deleteChatSession('test-session-1');

    expect(result.success).toBe(true);

    // Verify all data is deleted
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, 'test-session-1'))
      .execute();

    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, 'test-session-1'))
      .execute();

    const recordings = await db.select()
      .from(audioRecordingsTable)
      .where(eq(audioRecordingsTable.session_id, 'test-session-1'))
      .execute();

    expect(sessions).toHaveLength(0);
    expect(messages).toHaveLength(0);
    expect(recordings).toHaveLength(0);
  });

  it('should not affect other sessions when deleting one', async () => {
    // Create two test sessions
    await db.insert(chatSessionsTable)
      .values([
        {
          id: 'test-session-1',
          ...testSessionInput
        },
        {
          id: 'test-session-2',
          ...testSessionInput,
          user_id: 'user-456'
        }
      ])
      .execute();

    // Create messages for both sessions - convert numeric fields to strings
    await db.insert(chatMessagesTable)
      .values([
        {
          ...testMessageInput,
          audio_duration: testMessageInput.audio_duration?.toString() || null
        },
        {
          ...testMessageInput,
          session_id: 'test-session-2',
          content: 'Different message',
          audio_duration: testMessageInput.audio_duration?.toString() || null
        }
      ])
      .execute();

    const result = await deleteChatSession('test-session-1');

    expect(result.success).toBe(true);

    // Verify only first session is deleted
    const remainingSessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, 'test-session-2'))
      .execute();

    const remainingMessages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, 'test-session-2'))
      .execute();

    expect(remainingSessions).toHaveLength(1);
    expect(remainingMessages).toHaveLength(1);
    expect(remainingMessages[0].content).toEqual('Different message');
  });
});
