/**
 * D-Music Server — Entry Point (§2.2 Modularized)
 *
 * All route handlers are organized into domain-specific modules:
 *   routes-auth.ts       — /health, /signup
 *   routes-music.ts      — /likes, /annotations, /play, /comments, /songs
 *   routes-starpower.ts  — /starpower (CRUD, checkin, consume, leaderboard boost, shop)
 *   routes-user.ts       — /profile, /creators, /role, /preferences, /themes, /export, /error-report
 *   routes-community.ts  — /community, /shared-works, /works/fork, /copyright
 *   routes-ai.ts         — /ai/lyrics, /ai/compose
 *   routes-analytics.ts  — /leaderboard, /analytics, /listening-history, /recommendations, /smart-playlist
 *   routes-social.ts     — /achievements, /notifications, /timeline-comments, /fork-tree, /mheart
 *   routes-spacetime.ts  — /spacetime (capsules, messages, location)
 *   routes-challenge.ts  — /challenges (CRUD, submit, finalize, leaderboard)
 *   routes-live.ts       — /live (sessions, presence, danmaku)
 *   routes-albums.ts     — /albums (CRUD, tracks, artwork)
 *   routes-pki.ts        — /pki (certificate management, key exchange)
 *   routes-market.ts     — /market (store, purchase, inventory)
 *   routes-diagnostics.ts— /diagnostics (health checks, performance metrics)
 *   routes-upload.ts     — /upload (file upload, management)
 *
 * Shared utilities in server-utils.ts:
 *   - ROUTE_PREFIX, kv, requireAuth, wilsonScore, song index, shared work helpers
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

// §2.2 Route modules
import { registerAuthRoutes } from "./routes-auth.ts";
import { registerMusicRoutes } from "./routes-music.ts";
import { registerStarpowerRoutes } from "./routes-starpower.ts";
import { registerUserRoutes } from "./routes-user.ts";
import { registerCommunityRoutes } from "./routes-community.ts";
import { registerAiRoutes } from "./routes-ai.ts";
import { registerAnalyticsRoutes } from "./routes-analytics.ts";
import { registerSocialRoutes } from "./routes-social.ts";
import { registerSpacetimeRoutes } from "./routes-spacetime.ts";
import { registerChallengeRoutes } from "./routes-challenge.ts";
import { registerLiveSessionRoutes } from "./routes-live.ts";
import { registerAlbumRoutes } from "./routes-albums.ts";
import { registerPkiRoutes } from "./routes-pki.ts";
import { registerMarketRoutes } from "./routes-market.ts";
import { registerDiagnosticsRoutes } from "./routes-diagnostics.ts";
import { registerUploadRoutes } from "./routes-upload.ts";

const app = new Hono();

app.use('*', logger(console.log));

// §8.5 — CORS configuration (domain whitelist for security hardening)
app.use(
  "/*",
  cors({
    origin: (origin: string) => {
      // Allow Figma Make proxy domains and local development
      if (!origin) return '*';
      if (
        origin.endsWith('.figma.site') ||
        origin.endsWith('.supabase.co') ||
        origin.startsWith('http://localhost:')
      ) {
        return origin;
      }
      // Fallback: allow with log for auditing (can tighten to reject later)
      console.log(`[CORS] Unrecognized origin: ${origin}`);
      return origin;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ==========================================
// Register all route modules
// ==========================================
registerAuthRoutes(app);
registerMusicRoutes(app);
registerStarpowerRoutes(app);
registerUserRoutes(app);
registerCommunityRoutes(app);
registerAiRoutes(app);
registerAnalyticsRoutes(app);
registerSocialRoutes(app);
registerSpacetimeRoutes(app);
registerChallengeRoutes(app);
registerLiveSessionRoutes(app);
registerAlbumRoutes(app);
registerPkiRoutes(app);
registerMarketRoutes(app);
registerDiagnosticsRoutes(app);
registerUploadRoutes(app);

Deno.serve(app.fetch);
