
import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type CreateChatMessageInput, type ChatMessage } from '../schema';

export const createChatMessage = async (input: CreateChatMessageInput): Promise<ChatMessage> => {
  try {
    // Insert chat message record
    const result = await db.insert(chatMessagesTable)
      .values({
        session_id: input.session_id,
        message_type: input.message_type,
        content: input.content,
        transcription: input.transcription,
        audio_duration: input.audio_duration ? input.audio_duration.toString() : null // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const message = result[0];
    return {
      ...message,
      audio_duration: message.audio_duration ? parseFloat(message.audio_duration) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Chat message creation failed:', error);
    throw error;
  }
};
