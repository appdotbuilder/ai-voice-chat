
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type CreateChatSessionInput, type ChatSession } from '../schema';

export const createChatSession = async (input: CreateChatSessionInput): Promise<ChatSession> => {
  try {
    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert chat session record
    const result = await db.insert(chatSessionsTable)
      .values({
        id: sessionId,
        user_id: input.user_id || null,
        websocket_url: input.websocket_url,
        api_token: input.api_token,
        connection_status: input.connection_status // Zod default 'connecting' already applied
      })
      .returning()
      .execute();

    const chatSession = result[0];
    return {
      ...chatSession,
      created_at: chatSession.created_at,
      last_activity: chatSession.last_activity
    };
  } catch (error) {
    console.error('Chat session creation failed:', error);
    throw error;
  }
};
