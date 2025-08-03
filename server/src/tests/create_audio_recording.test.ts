
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { audioRecordingsTable, chatSessionsTable } from '../db/schema';
import { type CreateAudioRecordingInput } from '../schema';
import { createAudioRecording } from '../handlers/create_audio_recording';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateAudioRecordingInput = {
  session_id: 'session-123',
  file_path: '/uploads/recordings/audio-123.wav',
  duration: 45.67,
  sample_rate: 44100,
  channels: 2,
  format: 'wav',
  file_size: 1024000
};

describe('createAudioRecording', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an audio recording', async () => {
    // Create prerequisite chat session first
    await db.insert(chatSessionsTable)
      .values({
        id: 'session-123',
        websocket_url: 'wss://example.com',
        api_token: 'test-token'
      })
      .execute();

    const result = await createAudioRecording(testInput);

    // Basic field validation
    expect(result.session_id).toEqual('session-123');
    expect(result.file_path).toEqual('/uploads/recordings/audio-123.wav');
    expect(result.duration).toEqual(45.67);
    expect(typeof result.duration).toEqual('number');
    expect(result.sample_rate).toEqual(44100);
    expect(result.channels).toEqual(2);
    expect(result.format).toEqual('wav');
    expect(result.file_size).toEqual(1024000);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save audio recording to database', async () => {
    // Create prerequisite chat session first
    await db.insert(chatSessionsTable)
      .values({
        id: 'session-123',
        websocket_url: 'wss://example.com',
        api_token: 'test-token'
      })
      .execute();

    const result = await createAudioRecording(testInput);

    // Query using proper drizzle syntax
    const audioRecordings = await db.select()
      .from(audioRecordingsTable)
      .where(eq(audioRecordingsTable.id, result.id))
      .execute();

    expect(audioRecordings).toHaveLength(1);
    expect(audioRecordings[0].session_id).toEqual('session-123');
    expect(audioRecordings[0].file_path).toEqual('/uploads/recordings/audio-123.wav');
    expect(parseFloat(audioRecordings[0].duration)).toEqual(45.67);
    expect(audioRecordings[0].sample_rate).toEqual(44100);
    expect(audioRecordings[0].channels).toEqual(2);
    expect(audioRecordings[0].format).toEqual('wav');
    expect(audioRecordings[0].file_size).toEqual(1024000);
    expect(audioRecordings[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different audio formats and specifications', async () => {
    // Create prerequisite chat session first
    await db.insert(chatSessionsTable)
      .values({
        id: 'session-456',
        websocket_url: 'wss://example.com',
        api_token: 'test-token'
      })
      .execute();

    const mp3Input: CreateAudioRecordingInput = {
      session_id: 'session-456',
      file_path: '/uploads/recordings/audio-456.mp3',
      duration: 120.5,
      sample_rate: 22050,
      channels: 1,
      format: 'mp3',
      file_size: 512000
    };

    const result = await createAudioRecording(mp3Input);

    expect(result.format).toEqual('mp3');
    expect(result.duration).toEqual(120.5);
    expect(result.sample_rate).toEqual(22050);
    expect(result.channels).toEqual(1);
    expect(result.file_size).toEqual(512000);
  });

  it('should create audio recording even without existing session', async () => {
    // Test that audio recording can be created without session existing
    // (since there's no foreign key constraint enforced)
    const result = await createAudioRecording(testInput);

    expect(result.session_id).toEqual('session-123');
    expect(result.file_path).toEqual('/uploads/recordings/audio-123.wav');
    expect(result.duration).toEqual(45.67);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify it was saved to database
    const audioRecordings = await db.select()
      .from(audioRecordingsTable)
      .where(eq(audioRecordingsTable.id, result.id))
      .execute();

    expect(audioRecordings).toHaveLength(1);
    expect(audioRecordings[0].session_id).toEqual('session-123');
  });
});
