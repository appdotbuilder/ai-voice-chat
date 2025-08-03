
import { db } from '../db';
import { chatSessionsTable, chatMessagesTable, audioRecordingsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  try {
    // Delete in order to respect foreign key constraints
    // First delete audio recordings associated with the session
    await db.delete(audioRecordingsTable)
      .where(eq(audioRecordingsTable.session_id, sessionId))
      .execute();

    // Then delete chat messages associated with the session
    await db.delete(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, sessionId))
      .execute();

    // Finally delete the chat session itself
    const result = await db.delete(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .returning()
      .execute();

    // Return success true if session was found and deleted, false otherwise
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Chat session deletion failed:', error);
    throw error;
  }
}
