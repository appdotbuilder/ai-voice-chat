
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type UpdateChatSessionInput, type ChatSession } from '../schema';
import { eq } from 'drizzle-orm';

export const updateChatSession = async (input: UpdateChatSessionInput): Promise<ChatSession> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.connection_status !== undefined) {
      updateData.connection_status = input.connection_status;
    }
    
    if (input.last_activity !== undefined) {
      updateData.last_activity = input.last_activity;
    }

    // Update the chat session
    const result = await db.update(chatSessionsTable)
      .set(updateData)
      .where(eq(chatSessionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Chat session with id ${input.id} not found`);
    }

    // Return the updated session
    return result[0];
  } catch (error) {
    console.error('Chat session update failed:', error);
    throw error;
  }
};
