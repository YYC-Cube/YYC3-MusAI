/**
 * D-Music §2.3 — 应用层鉴权（取代 Supabase Auth）
 *
 * 密码：Node 内置 crypto PBKDF2-SHA256（无需新增 npm 依赖）
 * JWT  ：轻量级 HS256 手写实现（签名/验证/解码）
 * 存储 ：musai.users（password_hash），通过 db.ts 读写
 */

import * as crypto from "crypto";
import {
  getUserProfile,
  getUserByEmail,
  createUser,
} from "./db.ts";

// ----------------------------------------------------------
// 常量
// ----------------------------------------------------------

const JWT_ALG = "HS256";
const ISSUER = process.env.JWT_ISSUER ?? "YYC3-MusAI";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "musai-users";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 未配置，请在 .env / env_file 中设置");
  }
  return secret;
}

// ----------------------------------------------------------
// JWT（HS256）手写实现
// ----------------------------------------------------------

function base64UrlEncode(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer {
  let s = str;
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function parseExpiresIn(value: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 7 * 86_400;
  if (/d$/i.test(value)) return num * 86_400;
  if (/h$/i.test(value)) return num * 3600;
  if (/m$/i.test(value)) return num * 60;
  return num; // 秒
}

function signJwt(payload: Record<string, unknown>, expiresInSec: number): string {
  const header = base64UrlEncode(
    JSON.stringify({ alg: JWT_ALG, typ: "JWT" }),
  );
  const now = Math.floor(Date.now() / 1000);
  const payloadWithIat = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
    iss: ISSUER,
    aud: AUDIENCE,
  };
  const body = base64UrlEncode(JSON.stringify(payloadWithIat));
  const signingInput = `${header}.${body}`;
  const secret = getSecret();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signingInput, "utf8")
    .digest();
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const [headerB64, bodyB64, sigB64] = token.split(".");
    if (!headerB64 || !bodyB64 || !sigB64) return null;

    const signingInput = `${headerB64}.${bodyB64}`;
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(signingInput, "utf8")
      .digest();
    const actualSig = base64UrlDecode(sigB64);
    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const payload = JSON.parse(
      Buffer.from(base64UrlDecode(bodyB64)).toString("utf8"),
    ) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && typeof payload.exp === "number" && now >= payload.exp) {
      return null;
    }
    if (payload.iss && payload.iss !== ISSUER) return null;
    if (payload.aud && payload.aud !== AUDIENCE) return null;
    return payload;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------
// 密码哈希（PBKDF2-SHA256）
// 格式：pbkdf2$sha256$iterations$salt$hash
// ----------------------------------------------------------

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT_LEN = 16;
const PBKDF2_KEY_LEN = 32;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(PBKDF2_SALT_LEN);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LEN, "sha256");
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(hash)}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
    const [, algo, iterStr, saltB64, hashB64] = parts;
    const iterations = parseInt(iterStr, 10);
    const salt = base64UrlDecode(saltB64);
    const expectedHash = base64UrlDecode(hashB64);
    const actualHash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEY_LEN, algo as string);
    return crypto.timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------
// 会话签发
// ----------------------------------------------------------

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export function signAccessToken(payload: JWTPayload): string {
  const expiresInSec = parseExpiresIn(process.env.JWT_EXPIRES_IN ?? "7d");
  return signJwt(
    { sub: payload.userId, email: payload.email, role: payload.role },
    expiresInSec,
  );
}

// ----------------------------------------------------------
// 从请求中解析当前用户（JWT 版，取代 supabase.auth.getUser）
// ----------------------------------------------------------

export interface AuthedUser {
  id: string;
  email: string;
  role?: string;
}

export async function getUserFromRequest(
  authorization: string | null,
): Promise<AuthedUser | null> {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const payload = verifyJwt(match[1]);
  if (!payload) return null;
  const userId = (payload.sub as string) || "";
  if (!userId) return null;
  // 以关系表 users 作为权威来源，确保用户存在且角色最新
  const profile = await getUserProfile(userId);
  if (!profile) return null;
  return {
    id: userId,
    email: (profile.email as string) || (payload.email as string) || "",
    role: ((profile.role as string) || (payload.role as string) || "user"),
  };
}

// ----------------------------------------------------------
// 注册：写入 users（带 password_hash）+ star_power + preferences
// ----------------------------------------------------------

export async function registerUser({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ userId: string; accessToken: string; user: AuthedUser }> {
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  await createUser(userId, {
    email,
    passwordHash,
    displayName,
  });

  const accessToken = signAccessToken({ userId, email, role: "user" });
  const user: AuthedUser = { id: userId, email, role: "user" };
  return { userId, accessToken, user };
}

// ----------------------------------------------------------
// 登录：验证 password_hash，签发 access token
// ----------------------------------------------------------

export async function loginUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ userId: string; accessToken: string; user: AuthedUser } | null> {
  const profile = await getUserByEmail(email);
  if (!profile) return null;
  const passwordHash = (profile.password_hash as string) || "";
  if (!passwordHash || !verifyPassword(password, passwordHash)) return null;

  const userId = (profile.id as string) || "";
  const role = ((profile.role as string) || "user");
  const accessToken = signAccessToken({ userId, email, role });
  const user: AuthedUser = { id: userId, email, role };
  return { userId, accessToken, user };
}
