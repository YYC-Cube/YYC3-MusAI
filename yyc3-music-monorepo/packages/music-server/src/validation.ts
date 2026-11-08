/**
 * D-Music §5.2 — Zod Validation Schemas
 * 关键写操作的输入验证，防止脏数据、注入攻击和边界溢出
 */
import { z } from 'npm:zod@3.23.8';

// ============================================================
// Shared / Reusable Schemas
// ============================================================

/** Safe text: trimmed, non-empty, max length */
const safeText = (max: number) =>
  z.string().trim().min(1, 'Required').max(max, `Max ${max} chars`);

const userId = safeText(128);
const userName = safeText(64);
const songId = safeText(128);
const workId = safeText(128);

const emotionEnum = z.enum([
  'happy', 'sad', 'energetic', 'calm', 'neutral', 'love',
  'nostalgic', 'hopeful', 'angry', 'romantic',
]);

// ============================================================
// 1. Shared Works
// ============================================================

export const shareWorkSchema = z.object({
  workId,
  title: safeText(200),
  theme: z.string().max(50).optional().default('happy'),
  lyrics: z.array(z.string().max(500)).max(200).optional().default([]),
  mode: z.string().max(30).optional().default('quick'),
  createdAt: z.number().int().positive().optional(),
  userId: userId.optional().default('anon'),
  userName: userName.optional().default('Creator'),
});

// ============================================================
// 2. Space-Time Messages
// ============================================================

export const spaceTimeMessageSchema = z.object({
  userId: userId.optional().default('anon'),
  userName: userName.optional().default('Anonymous'),
  content: safeText(500),
  type: z.enum(['text', 'voice']).optional().default('text'),
  targetTime: z.string().max(50).nullable().optional(),
  targetLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    label: z.string().max(200).optional(),
  }).nullable().optional(),
  songId: z.string().max(128).nullable().optional(),
  songTitle: z.string().max(200).nullable().optional(),
  emotion: z.string().max(30).optional().default('neutral'),
  isPublic: z.boolean().optional().default(true),
});

// ============================================================
// 3. Space-Time Replies
// ============================================================

export const spaceTimeReplySchema = z.object({
  userId: userId.optional().default('anon'),
  userName: userName.optional().default('Anonymous'),
  content: safeText(300),
});

// ============================================================
// 4. Time Capsules
// ============================================================

export const timeCapsuleSchema = z.object({
  userId: userId.optional().default('anon'),
  userName: userName.optional().default('Anonymous'),
  title: safeText(100),
  content: safeText(1000),
  unlockAt: z.string().min(1, 'Unlock date required'),
  emotion: z.string().max(30).optional().default('neutral'),
  recipientName: z.string().max(64).optional(),
  songId: z.string().max(128).nullable().optional(),
  songTitle: z.string().max(200).nullable().optional(),
  // E2EE fields (P3 §2 → §3 integration)
  encrypted: z.boolean().optional().default(false),
  encryptedContent: z.string().max(10000).optional(),
  encryptedSessionKey: z.string().max(2000).optional(),
  encryptionIv: z.string().max(200).optional(),
  senderFingerprint: z.string().max(200).optional(),
  recipientUserId: z.string().max(128).optional(),
});

// ============================================================
// 5. Comments
// ============================================================

export const commentSchema = z.object({
  userId: userId.optional().default('anon'),
  userName,
  text: safeText(1000),
  timestamp: z.number().nonnegative().optional(),
});

// ============================================================
// 6. Annotations
// ============================================================

export const annotationSchema = z.object({
  lineIndex: z.number().int().nonnegative(),
  emotion: emotionEnum,
});

// ============================================================
// 7. Fork Work
// ============================================================

export const forkWorkSchema = z.object({
  userId,
  userName: userName.optional().default('User'),
  originalWorkId: workId,
  originalAuthor: z.string().max(64).optional().default('Unknown'),
  title: safeText(200),
  theme: z.string().max(50).optional().default('happy'),
  lyrics: z.array(z.string().max(500)).max(200).optional().default([]),
});

// ============================================================
// 8. Star Power Operations
// ============================================================

export const starPowerAddSchema = z.object({
  amount: z.number().int().positive().max(10000),
  reason: safeText(200),
});

export const starPowerConsumeSchema = z.object({
  amount: z.number().int().positive().max(10000),
  purpose: safeText(200),
  targetId: z.string().max(200).optional(),
});

// ============================================================
// 9. Leaderboard Boost
// ============================================================

export const leaderboardBoostSchema = z.object({
  songId,
  userId,
  amount: z.number().int().positive().max(10000).optional().default(100),
  starPowerCost: z.number().int().positive().max(10000).optional(),
});

// ============================================================
// 10. Copyright Application
// ============================================================

export const copyrightApplySchema = z.object({
  workId,
  userId,
  userName: userName.optional().default('User'),
  workTitle: safeText(200),
  description: z.string().max(2000).optional().default(''),
});

// ============================================================
// 11. Song Register
// ============================================================

export const songRegisterSchema = z.object({
  songId,
});

// ============================================================
// 12. Profile Update
// ============================================================

export const profileUpdateSchema = z.object({
  displayName: z.string().max(64).optional(),
  bio: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal('')),
  avatar: z.string().url().max(500).optional().or(z.literal('')),
}).passthrough(); // allow additional profile fields

// ============================================================
// 13. Market Listing (P3 §3 — Secondary Market)
// ============================================================

export const marketListSchema = z.object({
  userId,
  userName: userName.optional().default('Anonymous'),
  albumId: safeText(128),
  price: z.number().int().positive().max(100000, 'Max price 100,000 SP'),
});

export const marketBuySchema = z.object({
  userId,
  userName: userName.optional().default('Anonymous'),
});

// ============================================================
// 14. Album Operations (P3 §1 — Digital Album Distribution)
// ============================================================

export const albumCreateSchema = z.object({
  creatorId: userId,
  creatorName: userName.optional().default('Anonymous'),
  title: safeText(200),
  description: z.string().max(2000).optional().default(''),
  genre: z.string().max(50).optional().default('Other'),
  tracks: z.array(z.object({
    songId: z.string().max(128).optional(),
    title: z.string().max(200),
    artist: z.string().max(100).optional(),
    duration: z.number().nonnegative().optional().default(180),
  })).min(1, 'At least 1 track required').max(50),
  price: z.number().int().nonnegative().max(100000).optional().default(100),
  limitedEdition: z.boolean().optional().default(false),
  maxSupply: z.number().int().positive().max(100000).optional(),
  tags: z.array(z.string().max(30)).max(20).optional().default([]),
});

export const albumPurchaseSchema = z.object({
  userId,
});

// ============================================================
// 15. Live Session (§26 — Real-time Interaction)
// ============================================================

export const liveHeartbeatSchema = z.object({
  userId,
  userName: userName.optional().default('User'),
  trackId: z.string().max(128).optional(),
  trackTitle: z.string().max(200).optional(),
  emotion: z.string().max(30).optional(),
  isPlaying: z.boolean().optional().default(false),
});

export const liveLeaveSchema = z.object({
  userId,
});

export const danmakuSchema = z.object({
  userId,
  userName: userName.optional().default('User'),
  text: safeText(100),
  trackId: z.string().max(128).optional(),
  color: z.string().max(20).optional().default('#FFD700'),
});

// ============================================================
// 16. Challenge Submission (§23-§24 — Creative Challenges)
// ============================================================

export const challengeSubmitSchema = z.object({
  userId,
  userName: userName.optional().default('Unknown'),
  workId: z.string().max(128).optional(),
  workTitle: safeText(200),
  workTheme: z.string().max(50).optional().default(''),
  workLyrics: z.array(z.string().max(500)).max(200).optional().default([]),
});

export const challengeVoteSchema = z.object({
  userId,
  entryId: safeText(128),
});

// ============================================================
// 17. Timeline Comment (§19 — Timeline Comments)
// ============================================================

export const timelineCommentSchema = z.object({
  userId: userId.optional().default('anon'),
  userName,
  text: safeText(500),
  timestamp: z.number().nonnegative(),
  songId,
});

// ============================================================
// 18. Shop Purchase (Star Power Shop)
// ============================================================

export const shopPurchaseSchema = z.object({
  userId,
  itemId: safeText(64),
});

// ============================================================
// 19. Achievement Track
// ============================================================

export const achievementTrackSchema = z.object({
  action: safeText(50),
});

// ============================================================
// Helper: validate and return parsed data or error response
// ============================================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  return { success: false, error: `Validation failed: ${issues}` };
}