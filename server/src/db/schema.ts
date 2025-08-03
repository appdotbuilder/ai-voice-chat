
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const messageTypeEnum = pgEnum('message_type', ['user_audio', 'user_text', 'ai_audio', 'ai_text']);
export const connectionStatusEnum = pgEnum('connection_status', ['connected', 'disconnected', 'connecting', 'error']);

// Chat sessions table
export const chatSessionsTable = pgTable('chat_sessions', {
  id: varchar('id', { length: 255 }).primaryKey(), // UUID or custom session ID
  user_id: varchar('user_id', { length: 255 }), // Nullable user identification
  websocket_url: text('websocket_url').notNull(),
  api_token: text('api_token').notNull(),
  connection_status: connectionStatusEnum('connection_status').notNull().default('connecting'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_activity: timestamp('last_activity').defaultNow().notNull(),
});

// Chat messages table
export const chatMessagesTable = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  session_id: varchar('session_id', { length: 255 }).notNull(),
  message_type: messageTypeEnum('message_type').notNull(),
  content: text('content'), // Text content or audio file path
  transcription: text('transcription'), // Transcription of audio messages
  audio_duration: numeric('audio_duration', { precision: 10, scale: 2 }), // Duration in seconds
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Audio recordings table
export const audioRecordingsTable = pgTable('audio_recordings', {
  id: serial('id').primaryKey(),
  session_id: varchar('session_id', { length: 255 }).notNull(),
  file_path: text('file_path').notNull(),
  duration: numeric('duration', { precision: 10, scale: 2 }).notNull(), // Duration in seconds
  sample_rate: integer('sample_rate').notNull(),
  channels: integer('channels').notNull(),
  format: varchar('format', { length: 10 }).notNull(), // e.g., 'wav', 'mp3'
  file_size: integer('file_size').notNull(), // File size in bytes
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const chatSessionsRelations = relations(chatSessionsTable, ({ many }) => ({
  messages: many(chatMessagesTable),
  audioRecordings: many(audioRecordingsTable),
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  session: one(chatSessionsTable, {
    fields: [chatMessagesTable.session_id],
    references: [chatSessionsTable.id],
  }),
}));

export const audioRecordingsRelations = relations(audioRecordingsTable, ({ one }) => ({
  session: one(chatSessionsTable, {
    fields: [audioRecordingsTable.session_id],
    references: [chatSessionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type ChatSession = typeof chatSessionsTable.$inferSelect;
export type NewChatSession = typeof chatSessionsTable.$inferInsert;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;
export type AudioRecording = typeof audioRecordingsTable.$inferSelect;
export type NewAudioRecording = typeof audioRecordingsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  chatSessions: chatSessionsTable,
  chatMessages: chatMessagesTable,
  audioRecordings: audioRecordingsTable,
};
