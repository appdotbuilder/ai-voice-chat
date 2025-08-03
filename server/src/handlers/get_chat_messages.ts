
import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type ChatMessage } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const results = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, sessionId))
      .orderBy(asc(chatMessagesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(message => ({
      ...message,
      audio_duration: message.audio_duration ? parseFloat(message.audio_duration) : null
    }));
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    throw error;
  }
}
