
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type ChatSession } from '../schema';
import { eq } from 'drizzle-orm';

export const getChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const result = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const session = result[0];
    return {
      ...session,
      // No numeric conversions needed - all fields are already proper types
    };
  } catch (error) {
    console.error('Chat session retrieval failed:', error);
    throw error;
  }
};
