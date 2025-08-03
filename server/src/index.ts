
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createChatSessionInputSchema,
  updateChatSessionInputSchema,
  createChatMessageInputSchema,
  createAudioRecordingInputSchema
} from './schema';

// Import handlers
import { createChatSession } from './handlers/create_chat_session';
import { updateChatSession } from './handlers/update_chat_session';
import { createChatMessage } from './handlers/create_chat_message';
import { getChatMessages } from './handlers/get_chat_messages';
import { createAudioRecording } from './handlers/create_audio_recording';
import { getAudioRecordings } from './handlers/get_audio_recordings';
import { getChatSession } from './handlers/get_chat_session';
import { deleteChatSession } from './handlers/delete_chat_session';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Chat session routes
  createChatSession: publicProcedure
    .input(createChatSessionInputSchema)
    .mutation(({ input }) => createChatSession(input)),

  updateChatSession: publicProcedure
    .input(updateChatSessionInputSchema)
    .mutation(({ input }) => updateChatSession(input)),

  getChatSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => getChatSession(input.sessionId)),

  deleteChatSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => deleteChatSession(input.sessionId)),

  // Chat message routes
  createChatMessage: publicProcedure
    .input(createChatMessageInputSchema)
    .mutation(({ input }) => createChatMessage(input)),

  getChatMessages: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => getChatMessages(input.sessionId)),

  // Audio recording routes
  createAudioRecording: publicProcedure
    .input(createAudioRecordingInputSchema)
    .mutation(({ input }) => createAudioRecording(input)),

  getAudioRecordings: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => getAudioRecordings(input.sessionId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
