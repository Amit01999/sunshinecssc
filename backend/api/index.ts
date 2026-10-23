import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { connectDB } from "../src/config/db";

// Vercel's Node.js runtime invokes this file's default export per-request instead of calling
// app.listen() - there is no persistent process, so server.ts (and its graceful-shutdown signal
// handlers) is never used in this deployment path. Connecting to Mongo must happen lazily, here,
// not at module scope, so a failed first attempt doesn't permanently wedge a warm container.
const app = createApp();

let dbReady: Promise<void> | null = null;
function ensureDB(): Promise<void> {
  if (!dbReady) {
    // A warm container reuses this module (and mongoose's own connection) across invocations,
    // so concurrent requests on a cold container must await the SAME connect() call rather than
    // each starting their own - caching the promise (not just a boolean) is what makes that safe.
    dbReady = connectDB().catch((err) => {
      dbReady = null; // let the next request retry instead of staying wedged on a failed attempt
      throw err;
    });
  }
  return dbReady;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDB();
  app(req, res);
}
