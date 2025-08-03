
import { db } from '../db';
import { audioRecordingsTable } from '../db/schema';
import { type CreateAudioRecordingInput, type AudioRecording } from '../schema';

export const createAudioRecording = async (input: CreateAudioRecordingInput): Promise<AudioRecording> => {
  try {
    // Insert audio recording record
    const result = await db.insert(audioRecordingsTable)
      .values({
        session_id: input.session_id,
        file_path: input.file_path,
        duration: input.duration.toString(), // Convert number to string for numeric column
        sample_rate: input.sample_rate, // Integer column - no conversion needed
        channels: input.channels, // Integer column - no conversion needed
        format: input.format,
        file_size: input.file_size // Integer column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const audioRecording = result[0];
    return {
      ...audioRecording,
      duration: parseFloat(audioRecording.duration) // Convert string back to number
    };
  } catch (error) {
    console.error('Audio recording creation failed:', error);
    throw error;
  }
};
