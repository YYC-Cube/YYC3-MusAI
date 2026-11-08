/**
 * D-Music §2.2 — Space-Time Call System Routes
 *
 * Routes: spacetime/messages/*, spacetime/capsules/*, voice/*, stt/*
 * Extracted from index.tsx for modularization.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { requireAuth, ROUTE_PREFIX } from "./server-utils.ts";
import { rateLimit, RATE_STANDARD, RATE_SENSITIVE } from "./rate-limit.ts";
import {
  validate, spaceTimeMessageSchema, spaceTimeReplySchema, timeCapsuleSchema,
} from "./validation.ts";

const P = ROUTE_PREFIX;

// ==========================================
// Voice Storage (Supabase Storage)
// ==========================================
const VOICE_BUCKET = 'make-f626b673-voice';
let voiceBucketReady = false;
async function ensureVoiceBucket() {
  if (voiceBucketReady) return;
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.some((b: any) => b.name === VOICE_BUCKET)) {
      await sb.storage.createBucket(VOICE_BUCKET, { public: false });
      console.log(`Created voice bucket: ${VOICE_BUCKET}`);
    }
    voiceBucketReady = true;
  } catch (err) { console.log('ensureVoiceBucket error:', err); }
}

export function registerSpacetimeRoutes(app: any) {

  // --- Messages ---
  app.post(`${P}/spacetime/messages`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(spaceTimeMessageSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, content, type, targetTime, targetLocation, songId, songTitle, emotion, isPublic } = parsed.data;

      const message = {
        id: `stm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId, userName, content, type,
        targetTime: targetTime || null,
        targetLocation: targetLocation || null,
        songId: songId || null,
        songTitle: songTitle || null,
        emotion, isPublic,
        likes: 0, likedBy: [] as string[], replies: 0,
        createdAt: Date.now(),
        status: targetTime ? 'scheduled' : 'active',
      };

      const existing = await kv.get("spacetime:messages");
      let messages = existing ? JSON.parse(existing as string) : [];
      messages = [message, ...messages].slice(0, 500);
      await kv.set("spacetime:messages", JSON.stringify(messages));

      console.log(`SpaceTime message created: "${content.slice(0, 30)}..." by ${userName}`);
      return c.json({ success: true, message });
    } catch (error) {
      console.log("Error creating spacetime message:", error);
      return c.json({ error: `Failed to create message: ${error}` }, 500);
    }
  });

  app.get(`${P}/spacetime/messages`, async (c: any) => {
    try {
      const existing = await kv.get("spacetime:messages");
      let messages = existing ? JSON.parse(existing as string) : [];
      const now = Date.now();
      messages = messages.filter((m: any) => {
        if (!m.isPublic) return false;
        if (m.status === 'scheduled' && m.targetTime) {
          const targetTs = new Date(m.targetTime).getTime();
          if (targetTs > now) return false;
          m.status = 'active';
        }
        return true;
      });
      return c.json({ messages });
    } catch (error) {
      console.log("Error fetching spacetime messages:", error);
      return c.json({ messages: [] }, 500);
    }
  });

  app.post(`${P}/spacetime/messages/:messageId/like`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const messageId = c.req.param("messageId");
    try {
      const body = await c.req.json();
      const { userId } = body;
      const existing = await kv.get("spacetime:messages");
      let messages = existing ? JSON.parse(existing as string) : [];
      const idx = messages.findIndex((m: any) => m.id === messageId);
      if (idx === -1) return c.json({ error: "Message not found" }, 404);

      const msg = messages[idx];
      if (!msg.likedBy) msg.likedBy = [];
      if (userId && msg.likedBy.includes(userId)) {
        msg.likedBy = msg.likedBy.filter((id: string) => id !== userId);
        msg.likes = Math.max(0, (msg.likes || 0) - 1);
      } else {
        if (userId) msg.likedBy.push(userId);
        msg.likes = (msg.likes || 0) + 1;
      }
      messages[idx] = msg;
      await kv.set("spacetime:messages", JSON.stringify(messages));
      return c.json({ success: true, likes: msg.likes, liked: userId ? msg.likedBy.includes(userId) : false });
    } catch (error) {
      console.log(`Error liking spacetime message ${messageId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  app.post(`${P}/spacetime/messages/:messageId/reply`, async (c: any) => {
    const messageId = c.req.param("messageId");
    try {
      const body = await c.req.json();
      const parsed = validate(spaceTimeReplySchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, content } = parsed.data;

      const reply = {
        id: `str-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        messageId, userId, userName, content, createdAt: Date.now(),
      };

      const repliesKey = `spacetime:replies:${messageId}`;
      const existingReplies = await kv.get(repliesKey);
      let replies = existingReplies ? JSON.parse(existingReplies as string) : [];
      replies = [reply, ...replies].slice(0, 50);
      await kv.set(repliesKey, JSON.stringify(replies));

      const existing = await kv.get("spacetime:messages");
      let messages = existing ? JSON.parse(existing as string) : [];
      const idx = messages.findIndex((m: any) => m.id === messageId);
      if (idx >= 0) {
        messages[idx].replies = (messages[idx].replies || 0) + 1;
        await kv.set("spacetime:messages", JSON.stringify(messages));
      }

      return c.json({ success: true, reply });
    } catch (error) {
      console.log(`Error replying to spacetime message ${messageId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  app.get(`${P}/spacetime/messages/:messageId/replies`, async (c: any) => {
    const messageId = c.req.param("messageId");
    try {
      const repliesKey = `spacetime:replies:${messageId}`;
      const existing = await kv.get(repliesKey);
      const replies = existing ? JSON.parse(existing as string) : [];
      return c.json({ replies });
    } catch (error) {
      console.log(`Error fetching replies for ${messageId}:`, error);
      return c.json({ replies: [] }, 500);
    }
  });

  // --- Time Capsules ---
  app.post(`${P}/spacetime/capsules`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(timeCapsuleSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, title, content, unlockAt, songId, songTitle, emotion, recipientName,
        encrypted, encryptedContent, encryptedSessionKey, encryptionIv, senderFingerprint, recipientUserId,
      } = parsed.data;

      const unlockTs = new Date(unlockAt).getTime();
      if (isNaN(unlockTs)) return c.json({ error: "Invalid unlockAt date format" }, 400);

      // Build capsule with optional E2EE fields (P3 §2 integration)
      const capsule: any = {
        id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId, userName, title,
        // If encrypted, store ciphertext; plaintext content serves as "[Encrypted]" placeholder
        content: encrypted ? '[E2EE Encrypted]' : content,
        unlockAt, unlockTs,
        songId: songId || null, songTitle: songTitle || null,
        emotion, recipientName: recipientName || null,
        isUnlocked: false, likes: 0, createdAt: Date.now(),
      };

      // Attach E2EE payload (server stores opaque blobs, cannot decrypt)
      if (encrypted && encryptedContent && encryptedSessionKey && encryptionIv) {
        capsule.encrypted = true;
        capsule.encryptedContent = encryptedContent;
        capsule.encryptedSessionKey = encryptedSessionKey;
        capsule.encryptionIv = encryptionIv;
        capsule.senderFingerprint = senderFingerprint || null;
        capsule.recipientUserId = recipientUserId || null;
      }

      const existing = await kv.get("spacetime:capsules");
      let capsules = existing ? JSON.parse(existing as string) : [];
      capsules = [capsule, ...capsules].slice(0, 200);
      await kv.set("spacetime:capsules", JSON.stringify(capsules));

      const e2eLabel = encrypted ? ' [E2EE]' : '';
      console.log(`Time capsule created${e2eLabel}: "${title}" by ${userName}, unlocks at ${unlockAt}`);
      return c.json({ success: true, capsule });
    } catch (error) {
      console.log("Error creating time capsule:", error);
      return c.json({ error: `Failed to create capsule: ${error}` }, 500);
    }
  });

  app.get(`${P}/spacetime/capsules`, async (c: any) => {
    try {
      const existing = await kv.get("spacetime:capsules");
      let capsules = existing ? JSON.parse(existing as string) : [];
      const now = Date.now();
      capsules = capsules.map((cap: any) => {
        if (!cap.isUnlocked && cap.unlockTs && cap.unlockTs <= now) cap.isUnlocked = true;
        return cap;
      });
      await kv.set("spacetime:capsules", JSON.stringify(capsules));
      return c.json({ capsules });
    } catch (error) {
      console.log("Error fetching time capsules:", error);
      return c.json({ capsules: [] }, 500);
    }
  });

  app.post(`${P}/spacetime/capsules/:capsuleId/like`, async (c: any) => {
    const capsuleId = c.req.param("capsuleId");
    try {
      const existing = await kv.get("spacetime:capsules");
      let capsules = existing ? JSON.parse(existing as string) : [];
      const idx = capsules.findIndex((cap: any) => cap.id === capsuleId);
      if (idx === -1) return c.json({ error: "Capsule not found" }, 404);
      capsules[idx].likes = (capsules[idx].likes || 0) + 1;
      await kv.set("spacetime:capsules", JSON.stringify(capsules));
      return c.json({ success: true, likes: capsules[idx].likes });
    } catch (error) {
      console.log(`Error liking capsule ${capsuleId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // --- Nearby Messages ---
  app.get(`${P}/spacetime/messages/nearby`, async (c: any) => {
    try {
      const lat = parseFloat(c.req.query("lat") || "0");
      const lng = parseFloat(c.req.query("lng") || "0");
      const radiusKm = parseFloat(c.req.query("radius") || "50");
      if (!lat && !lng) return c.json({ messages: [] });

      const existing = await kv.get("spacetime:messages");
      let messages = existing ? JSON.parse(existing as string) : [];

      const toRad = (d: number) => d * Math.PI / 180;
      const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const nearby = messages.filter((m: any) => {
        if (!m.targetLocation || !m.targetLocation.lat || !m.targetLocation.lng) return false;
        return haversine(lat, lng, m.targetLocation.lat, m.targetLocation.lng) <= radiusKm;
      }).map((m: any) => ({
        ...m, distance: haversine(lat, lng, m.targetLocation.lat, m.targetLocation.lng),
      })).sort((a: any, b: any) => a.distance - b.distance);

      return c.json({ messages: nearby });
    } catch (error) {
      console.log("Error fetching nearby messages:", error);
      return c.json({ messages: [] }, 500);
    }
  });

  // --- Voice Upload/URL ---
  app.post(`${P}/voice/upload`, async (c: any) => {
    try {
      const body = await c.req.json();
      const { userId, audioBase64, mimeType } = body;
      if (!userId || !audioBase64) return c.json({ error: 'userId and audioBase64 required' }, 400);
      await ensureVoiceBucket();
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const ext = (mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await sb.storage.from(VOICE_BUCKET).upload(fileName, bytes, { contentType: mimeType || 'audio/webm', upsert: false });
      if (uploadErr) { console.log('Voice upload error:', uploadErr); return c.json({ error: `Upload failed: ${uploadErr.message}` }, 500); }
      const { data: signedData, error: signErr } = await sb.storage.from(VOICE_BUCKET).createSignedUrl(fileName, 3600);
      if (signErr) return c.json({ error: `Signed URL failed: ${signErr.message}` }, 500);
      console.log(`Voice uploaded: ${fileName}`);
      return c.json({ success: true, filePath: fileName, signedUrl: signedData?.signedUrl });
    } catch (error) { console.log('Voice upload error:', error); return c.json({ error: `Voice upload failed: ${error}` }, 500); }
  });

  app.get(`${P}/voice/url`, async (c: any) => {
    try {
      const filePath = c.req.query("path");
      if (!filePath) return c.json({ error: 'path query required' }, 400);
      await ensureVoiceBucket();
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data, error } = await sb.storage.from(VOICE_BUCKET).createSignedUrl(filePath, 3600);
      if (error) return c.json({ error: `URL failed: ${error.message}` }, 500);
      return c.json({ signedUrl: data?.signedUrl });
    } catch (error) { console.log('Voice URL error:', error); return c.json({ error: `Failed: ${error}` }, 500); }
  });

  // --- STT Proxy ---
  app.post(`${P}/stt/transcribe`, async (c: any) => {
    try {
      const body = await c.req.json();
      const { audioBase64, language } = body;
      if (!audioBase64) return c.json({ error: 'audioBase64 required' }, 400);
      const localApiUrl = Deno.env.get('DMUSIC_LOCAL_API');
      if (localApiUrl) {
        try {
          const resp = await fetch(`${localApiUrl}/api/v1/stt/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, language: language || 'zh' }),
          });
          if (resp.ok) {
            const data = await resp.json();
            return c.json(data);
          }
        } catch (err) {
          console.log('Local STT API error:', err);
        }
      }
      return c.json({ text: '', segments: [], message: 'STT service not configured. Set DMUSIC_LOCAL_API environment variable.' });
    } catch (error) {
      console.log('STT error:', error);
      return c.json({ error: `STT failed: ${error}` }, 500);
    }
  });
}