
import { z } from 'zod';

// Chat message schema
export const chatMessageSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  message_type: z.enum(['user_audio', 'user_text', 'ai_audio', 'ai_text']),
  content: z.string().nullable(), // Text content or audio file path
  transcription: z.string().nullable(), // Transcription of audio messages
  audio_duration: z.number().nullable(), // Duration in seconds for audio messages
  created_at: z.coerce.date()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Chat session schema
export const chatSessionSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(), // Optional user identification
  websocket_url: z.string(),
  api_token: z.string(),
  connection_status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
  created_at: z.coerce.date(),
  last_activity: z.coerce.date()
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

// Audio recording schema
export const audioRecordingSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  file_path: z.string(),
  duration: z.number(), // Duration in seconds
  sample_rate: z.number().int(),
  channels: z.number().int(),
  format: z.string(), // e.g., 'wav', 'mp3'
  file_size: z.number().int(), // File size in bytes
  created_at: z.coerce.date()
});

export type AudioRecording = z.infer<typeof audioRecordingSchema>;

// Input schemas for creating records
export const createChatMessageInputSchema = z.object({
  session_id: z.string(),
  message_type: z.enum(['user_audio', 'user_text', 'ai_audio', 'ai_text']),
  content: z.string().nullable(),
  transcription: z.string().nullable(),
  audio_duration: z.number().positive().nullable()
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

export const createChatSessionInputSchema = z.object({
  user_id: z.string().nullable().optional(),
  websocket_url: z.string().url(),
  api_token: z.string().min(1),
  connection_status: z.enum(['connected', 'disconnected', 'connecting', 'error']).default('connecting')
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionInputSchema>;

export const createAudioRecordingInputSchema = z.object({
  session_id: z.string(),
  file_path: z.string(),
  duration: z.number().positive(),
  sample_rate: z.number().int().positive(),
  channels: z.number().int().positive(),
  format: z.string(),
  file_size: z.number().int().positive()
});

export type CreateAudioRecordingInput = z.infer<typeof createAudioRecordingInputSchema>;

// Update schemas
export const updateChatSessionInputSchema = z.object({
  id: z.string(),
  connection_status: z.enum(['connected', 'disconnected', 'connecting', 'error']).optional(),
  last_activity: z.coerce.date().optional()
});

export type UpdateChatSessionInput = z.infer<typeof updateChatSessionInputSchema>;

// WebSocket message schemas
export const websocketMessageSchema = z.object({
  type: z.enum(['audio', 'text', 'status', 'error']),
  data: z.any(),
  timestamp: z.coerce.date()
});

export type WebSocketMessage = z.infer<typeof websocketMessageSchema>;

// Audio status schema for real-time indicators
export const audioStatusSchema = z.object({
  session_id: z.string(),
  is_recording: z.boolean(),
  is_playing: z.boolean(),
  volume_level: z.number().min(0).max(1), // Normalized volume level 0-1
  connection_status: z.enum(['connected', 'disconnected', 'connecting', 'error'])
});

export type AudioStatus = z.infer<typeof audioStatusSchema>;
