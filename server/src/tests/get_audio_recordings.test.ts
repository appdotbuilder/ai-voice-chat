
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { audioRecordingsTable, chatSessionsTable } from '../db/schema';
import { type CreateAudioRecordingInput, type CreateChatSessionInput } from '../schema';
import { getAudioRecordings } from '../handlers/get_audio_recordings';

// Helper to create a test session
const createTestSession = async () => {
  const sessionInput: CreateChatSessionInput = {
    user_id: 'test_user_123',
    websocket_url: 'wss://example.com/ws',
    api_token: 'test_token_456',
    connection_status: 'connected'
  };

  const result = await db.insert(chatSessionsTable)
    .values({
      id: 'test_session_123',
      user_id: sessionInput.user_id,
      websocket_url: sessionInput.websocket_url,
      api_token: sessionInput.api_token,
      connection_status: sessionInput.connection_status
    })
    .returning()
    .execute();

  return result[0];
};

// Helper to create a test audio recording
const createTestAudioRecording = async (sessionId: string, overrides: Partial<CreateAudioRecordingInput> = {}) => {
  const recordingInput: CreateAudioRecordingInput = {
    session_id: sessionId,
    file_path: '/audio/test_recording.wav',
    duration: 30.5,
    sample_rate: 44100,
    channels: 2,
    format: 'wav',
    file_size: 1024000,
    ...overrides
  };

  const result = await db.insert(audioRecordingsTable)
    .values({
      session_id: recordingInput.session_id,
      file_path: recordingInput.file_path,
      duration: recordingInput.duration.toString(), // Convert number to string
      sample_rate: recordingInput.sample_rate,
      channels: recordingInput.channels,
      format: recordingInput.format,
      file_size: recordingInput.file_size
    })
    .returning()
    .execute();

  return result[0];
};

describe('getAudioRecordings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no recordings exist', async () => {
    const recordings = await getAudioRecordings('nonexistent_session');
    expect(recordings).toEqual([]);
  });

  it('should return audio recordings for a session', async () => {
    // Create test session
    const session = await createTestSession();
    
    // Create test audio recording
    await createTestAudioRecording(session.id, {
      file_path: '/audio/recording1.wav',
      duration: 25.75
    });

    const recordings = await getAudioRecordings(session.id);

    expect(recordings).toHaveLength(1);
    expect(recordings[0].session_id).toEqual(session.id);
    expect(recordings[0].file_path).toEqual('/audio/recording1.wav');
    expect(recordings[0].duration).toEqual(25.75);
    expect(typeof recordings[0].duration).toBe('number');
    expect(recordings[0].sample_rate).toEqual(44100);
    expect(recordings[0].channels).toEqual(2);
    expect(recordings[0].format).toEqual('wav');
    expect(recordings[0].file_size).toEqual(1024000);
    expect(recordings[0].id).toBeDefined();
    expect(recordings[0].created_at).toBeInstanceOf(Date);
  });

  it('should return recordings ordered by creation time (newest first)', async () => {
    // Create test session
    const session = await createTestSession();
    
    // Create multiple recordings with different timestamps
    const recording1 = await createTestAudioRecording(session.id, {
      file_path: '/audio/first.wav',
      duration: 10.0
    });

    // Add small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const recording2 = await createTestAudioRecording(session.id, {
      file_path: '/audio/second.wav',
      duration: 15.5
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const recording3 = await createTestAudioRecording(session.id, {
      file_path: '/audio/third.wav',
      duration: 20.25
    });

    const recordings = await getAudioRecordings(session.id);

    expect(recordings).toHaveLength(3);
    // Should be ordered by created_at DESC (newest first)
    expect(recordings[0].file_path).toEqual('/audio/third.wav');
    expect(recordings[1].file_path).toEqual('/audio/second.wav');
    expect(recordings[2].file_path).toEqual('/audio/first.wav');
    
    // Verify timestamps are in descending order
    expect(recordings[0].created_at >= recordings[1].created_at).toBe(true);
    expect(recordings[1].created_at >= recordings[2].created_at).toBe(true);
  });

  it('should only return recordings for the specified session', async () => {
    // Create two test sessions
    const session1 = await createTestSession();
    
    const session2Result = await db.insert(chatSessionsTable)
      .values({
        id: 'test_session_456',
        user_id: 'test_user_789',
        websocket_url: 'wss://example.com/ws2',
        api_token: 'test_token_789',
        connection_status: 'connected'
      })
      .returning()
      .execute();
    const session2 = session2Result[0];

    // Create recordings for both sessions
    await createTestAudioRecording(session1.id, {
      file_path: '/audio/session1_recording.wav'
    });

    await createTestAudioRecording(session2.id, {
      file_path: '/audio/session2_recording.wav'
    });

    // Get recordings for session1 only
    const recordings = await getAudioRecordings(session1.id);

    expect(recordings).toHaveLength(1);
    expect(recordings[0].session_id).toEqual(session1.id);
    expect(recordings[0].file_path).toEqual('/audio/session1_recording.wav');
  });

  it('should handle different audio formats correctly', async () => {
    // Create test session
    const session = await createTestSession();
    
    // Create recordings with different formats
    await createTestAudioRecording(session.id, {
      file_path: '/audio/test.wav',
      format: 'wav',
      duration: 12.34
    });

    await createTestAudioRecording(session.id, {
      file_path: '/audio/test.mp3',
      format: 'mp3',
      duration: 56.78
    });

    const recordings = await getAudioRecordings(session.id);

    expect(recordings).toHaveLength(2);
    
    const wavRecording = recordings.find(r => r.format === 'wav');
    const mp3Recording = recordings.find(r => r.format === 'mp3');
    
    expect(wavRecording).toBeDefined();
    expect(wavRecording!.duration).toEqual(12.34);
    expect(typeof wavRecording!.duration).toBe('number');
    
    expect(mp3Recording).toBeDefined();
    expect(mp3Recording!.duration).toEqual(56.78);
    expect(typeof mp3Recording!.duration).toBe('number');
  });
});
