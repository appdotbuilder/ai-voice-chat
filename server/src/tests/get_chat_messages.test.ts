
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable, chatMessagesTable } from '../db/schema';
import { type CreateChatSessionInput, type CreateChatMessageInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';

const testSessionInput: CreateChatSessionInput = {
  user_id: 'user-123',
  websocket_url: 'wss://example.com/ws',
  api_token: 'test-token-123',
  connection_status: 'connected'
};

const testMessageInput: CreateChatMessageInput = {
  session_id: 'session-1',
  message_type: 'user_text',
  content: 'Hello, world!',
  transcription: null,
  audio_duration: null
};

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return messages for a session ordered by creation time', async () => {
    // Create a chat session first
    await db.insert(chatSessionsTable)
      .values({
        id: 'session-1',
        user_id: testSessionInput.user_id,
        websocket_url: testSessionInput.websocket_url,
        api_token: testSessionInput.api_token,
        connection_status: testSessionInput.connection_status
      })
      .execute();

    // Create multiple messages with different timestamps
    await db.insert(chatMessagesTable)
      .values([
        {
          session_id: 'session-1',
          message_type: 'user_text',
          content: 'First message',
          transcription: null,
          audio_duration: null
        },
        {
          session_id: 'session-1',
          message_type: 'ai_text',
          content: 'Second message',
          transcription: null,
          audio_duration: null
        },
        {
          session_id: 'session-1',
          message_type: 'user_audio',
          content: '/path/to/audio.wav',
          transcription: 'Third message transcription',
          audio_duration: '5.25' // String in DB, should be converted to number
        }
      ])
      .execute();

    const result = await getChatMessages('session-1');

    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[2].content).toEqual('/path/to/audio.wav');
    expect(result[2].transcription).toEqual('Third message transcription');
    expect(result[2].audio_duration).toEqual(5.25);
    expect(typeof result[2].audio_duration).toEqual('number');

    // Verify ordering by created_at
    for (let i = 1; i < result.length; i++) {
      expect(result[i].created_at >= result[i - 1].created_at).toBe(true);
    }
  });

  it('should return empty array for non-existent session', async () => {
    const result = await getChatMessages('non-existent-session');
    expect(result).toHaveLength(0);
  });

  it('should return empty array for session with no messages', async () => {
    // Create a session but no messages
    await db.insert(chatSessionsTable)
      .values({
        id: 'empty-session',
        user_id: testSessionInput.user_id,
        websocket_url: testSessionInput.websocket_url,
        api_token: testSessionInput.api_token,
        connection_status: testSessionInput.connection_status
      })
      .execute();

    const result = await getChatMessages('empty-session');
    expect(result).toHaveLength(0);
  });

  it('should handle numeric conversion for audio_duration', async () => {
    // Create a chat session first
    await db.insert(chatSessionsTable)
      .values({
        id: 'session-audio',
        user_id: testSessionInput.user_id,
        websocket_url: testSessionInput.websocket_url,
        api_token: testSessionInput.api_token,
        connection_status: testSessionInput.connection_status
      })
      .execute();

    // Create message with audio duration
    await db.insert(chatMessagesTable)
      .values({
        session_id: 'session-audio',
        message_type: 'user_audio',
        content: '/path/to/audio.wav',
        transcription: 'Audio message',
        audio_duration: '12.75' // String in DB
      })
      .execute();

    const result = await getChatMessages('session-audio');

    expect(result).toHaveLength(1);
    expect(result[0].audio_duration).toEqual(12.75);
    expect(typeof result[0].audio_duration).toEqual('number');
  });

  it('should only return messages for the specified session', async () => {
    // Create two sessions
    await db.insert(chatSessionsTable)
      .values([
        {
          id: 'session-1',
          user_id: testSessionInput.user_id,
          websocket_url: testSessionInput.websocket_url,
          api_token: testSessionInput.api_token,
          connection_status: testSessionInput.connection_status
        },
        {
          id: 'session-2',
          user_id: testSessionInput.user_id,
          websocket_url: testSessionInput.websocket_url,
          api_token: testSessionInput.api_token,
          connection_status: testSessionInput.connection_status
        }
      ])
      .execute();

    // Create messages for both sessions
    await db.insert(chatMessagesTable)
      .values([
        {
          session_id: 'session-1',
          message_type: 'user_text',
          content: 'Message for session 1',
          transcription: null,
          audio_duration: null
        },
        {
          session_id: 'session-2',
          message_type: 'user_text',
          content: 'Message for session 2',
          transcription: null,
          audio_duration: null
        }
      ])
      .execute();

    const result = await getChatMessages('session-1');

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message for session 1');
    expect(result[0].session_id).toEqual('session-1');
  });
});
