
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatMessagesTable, chatSessionsTable } from '../db/schema';
import { type CreateChatMessageInput } from '../schema';
import { createChatMessage } from '../handlers/create_chat_message';
import { eq } from 'drizzle-orm';

// Test session setup
const testSessionId = 'test-session-123';

// Test inputs for different message types
const textMessageInput: CreateChatMessageInput = {
  session_id: testSessionId,
  message_type: 'user_text',
  content: 'Hello, this is a test message',
  transcription: null,
  audio_duration: null
};

const audioMessageInput: CreateChatMessageInput = {
  session_id: testSessionId,
  message_type: 'user_audio',
  content: '/path/to/audio/file.wav',
  transcription: 'Hello, this is a test audio message',
  audio_duration: 15.5
};

const aiTextMessageInput: CreateChatMessageInput = {
  session_id: testSessionId,
  message_type: 'ai_text',
  content: 'This is an AI response',
  transcription: null,
  audio_duration: null
};

describe('createChatMessage', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite chat session
    await db.insert(chatSessionsTable)
      .values({
        id: testSessionId,
        user_id: 'test-user-123',
        websocket_url: 'wss://example.com/chat',
        api_token: 'test-token-123',
        connection_status: 'connected'
      })
      .execute();
  });

  afterEach(resetDB);

  it('should create a text message', async () => {
    const result = await createChatMessage(textMessageInput);

    // Basic field validation
    expect(result.session_id).toEqual(testSessionId);
    expect(result.message_type).toEqual('user_text');
    expect(result.content).toEqual('Hello, this is a test message');
    expect(result.transcription).toBeNull();
    expect(result.audio_duration).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an audio message with duration', async () => {
    const result = await createChatMessage(audioMessageInput);

    // Basic field validation
    expect(result.session_id).toEqual(testSessionId);
    expect(result.message_type).toEqual('user_audio');
    expect(result.content).toEqual('/path/to/audio/file.wav');
    expect(result.transcription).toEqual('Hello, this is a test audio message');
    expect(result.audio_duration).toEqual(15.5);
    expect(typeof result.audio_duration).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an AI text message', async () => {
    const result = await createChatMessage(aiTextMessageInput);

    // Basic field validation
    expect(result.session_id).toEqual(testSessionId);
    expect(result.message_type).toEqual('ai_text');
    expect(result.content).toEqual('This is an AI response');
    expect(result.transcription).toBeNull();
    expect(result.audio_duration).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const result = await createChatMessage(textMessageInput);

    // Query using proper drizzle syntax
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].session_id).toEqual(testSessionId);
    expect(messages[0].message_type).toEqual('user_text');
    expect(messages[0].content).toEqual('Hello, this is a test message');
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle numeric audio duration correctly in database', async () => {
    const result = await createChatMessage(audioMessageInput);

    // Query from database to verify numeric conversion
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].audio_duration).toBeDefined();
    // In database, numeric is stored as string
    expect(typeof messages[0].audio_duration).toBe('string');
    expect(parseFloat(messages[0].audio_duration!)).toEqual(15.5);
    
    // But returned result should have it as number
    expect(typeof result.audio_duration).toBe('number');
    expect(result.audio_duration).toEqual(15.5);
  });

  it('should create multiple messages for same session', async () => {
    await createChatMessage(textMessageInput);
    await createChatMessage(audioMessageInput);
    await createChatMessage(aiTextMessageInput);

    // Query all messages for the session
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, testSessionId))
      .execute();

    expect(messages).toHaveLength(3);
    
    // Verify different message types
    const messageTypes = messages.map(m => m.message_type);
    expect(messageTypes).toContain('user_text');
    expect(messageTypes).toContain('user_audio');
    expect(messageTypes).toContain('ai_text');
  });
});
