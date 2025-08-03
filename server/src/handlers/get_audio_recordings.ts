
import { db } from '../db';
import { audioRecordingsTable } from '../db/schema';
import { type AudioRecording } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getAudioRecordings = async (sessionId: string): Promise<AudioRecording[]> => {
  try {
    const results = await db.select()
      .from(audioRecordingsTable)
      .where(eq(audioRecordingsTable.session_id, sessionId))
      .orderBy(desc(audioRecordingsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(recording => ({
      ...recording,
      duration: parseFloat(recording.duration) // Convert string back to number
    }));
  } catch (error) {
    console.error('Audio recordings retrieval failed:', error);
    throw error;
  }
};
