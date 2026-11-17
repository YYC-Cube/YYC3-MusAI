/**
 * D-Music §2.2 — Auth Routes
 * Routes: /health, /signup, /login, /session
 *
 * 注：已去 Supabase 化。注册/登录/会话均走应用层 JWT（auth.ts），
 * 密码以 PBKDF2-SHA256 存储于 musai.users.password_hash。
 */

import { ROUTE_PREFIX, kv, requireAuth } from "./server-utils.ts";
import { rateLimit, RATE_AUTH } from "./rate-limit.ts";
import {
  registerUser,
  loginUser,
  signAccessToken,
  getUserFromRequest,
  type AuthedUser,
} from "./auth.ts";
import { apiError, ERROR_CODES } from "./api-contract.ts";

interface SignupBody {
  email: string;
  password: string;
  displayName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export function registerAuthRoutes(app: any) {
  // Health check
  app.get(`${ROUTE_PREFIX}/health`, (c: any) => {
    return c.json({ status: "ok" });
  });

  // Session（当前登录用户，供前端刷新会话）
  app.get(`${ROUTE_PREFIX}/session`, rateLimit(RATE_AUTH), async (c: any) => {
    try {
      const auth = c.req.header("Authorization");
      const user = await getUserFromRequest(auth ?? null);
      if (!user) {
        return apiError(c, 401, "未登录或会话已过期", undefined, ERROR_CODES.UNAUTHORIZED);
      }
      return c.json({ success: true, user });
    } catch (error) {
      return apiError(c, 500, "会话查询失败", undefined, ERROR_CODES.INTERNAL);
    }
  });

  // Signup（应用层注册，签发 JWT）
  app.post(`${ROUTE_PREFIX}/signup`, rateLimit(RATE_AUTH), async (c: any) => {
    try {
      const body = (await c.req.json()) as SignupBody;
      const { email, password, displayName } = body;

      if (!email || !password) {
        return apiError(c, 400, "邮箱和密码为必填项", undefined, ERROR_CODES.VALIDATION_FAILED);
      }

      const { userId, accessToken, user } = await registerUser({
        email,
        password,
        displayName: displayName || email.split("@")[0],
      });

      // 写入 KV 星力与角色（与原逻辑保持一致）
      await kv.set(`user:${userId}:starpower`, "100");
      await kv.set(`user:${userId}:role`, user.role || "user");

      return c.json({
        success: true,
        user,
        accessToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
      });
    } catch (error) {
      console.log(`Signup error: ${error}`);
      return apiError(c, 500, "注册失败", undefined, ERROR_CODES.INTERNAL);
    }
  });

  // Login（应用层登录，验证 password_hash，签发 JWT）
  app.post(`${ROUTE_PREFIX}/login`, rateLimit(RATE_AUTH), async (c: any) => {
    try {
      const body = (await c.req.json()) as LoginBody;
      const { email, password } = body;

      if (!email || !password) {
        return apiError(c, 400, "邮箱和密码为必填项", undefined, ERROR_CODES.VALIDATION_FAILED);
      }

      const result = await loginUser({ email, password });
      if (!result) {
        return apiError(c, 401, "邮箱或密码错误", undefined, ERROR_CODES.UNAUTHORIZED);
      }

      return c.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
      });
    } catch (error) {
      console.log(`Login error: ${error}`);
      return apiError(c, 500, "登录失败", undefined, ERROR_CODES.INTERNAL);
    }
  });

  // Logout（无状态 JWT：客户端丢弃 token 即可；服务端返回成功）
  app.post(`${ROUTE_PREFIX}/logout`, rateLimit(RATE_AUTH), async (c: any) => {
    return c.json({ success: true, message: "已退出登录，请客户端清除 token" });
  });
}
