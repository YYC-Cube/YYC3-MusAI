/**
 * D-Music §2.2 — Auth Routes
 * Routes: /health, /signup
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { ROUTE_PREFIX, kv } from "./server-utils.ts";
import { rateLimit, RATE_AUTH } from "./rate-limit.ts";

export function registerAuthRoutes(app: any) {
  // Health check
  app.get(`${ROUTE_PREFIX}/health`, (c: any) => {
    return c.json({ status: "ok" });
  });

  // Signup
  app.post(`${ROUTE_PREFIX}/signup`, rateLimit(RATE_AUTH), async (c: any) => {
    try {
      const body = await c.req.json();
      const { email, password, displayName } = body;

      if (!email || !password) {
        return c.json({ error: "Email and password are required" }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name: displayName || email.split('@')[0] },
        email_confirm: true,
      });

      if (error) {
        console.log(`Signup error for ${email}: ${error.message}`);
        return c.json({ error: error.message }, 400);
      }

      if (data.user) {
        await kv.set(`user:${data.user.id}:starpower`, "100");
        await kv.set(`user:${data.user.id}:role`, "user");
        const profile = {
          userId: data.user.id,
          email,
          displayName: displayName || email.split('@')[0],
          starPower: 100,
          totalListeningTime: 0,
          totalAnnotations: 0,
          totalLikes: 0,
          achievements: [],
          joinedAt: new Date().toISOString(),
          streak: 0,
          role: 'user',
        };
        await kv.set(`user:${data.user.id}:profile`, JSON.stringify(profile));
        console.log(`New user created: ${email} (${data.user.id}), role=user, 100 SP`);
      }

      return c.json({ success: true, user: data.user });
    } catch (error) {
      console.log(`Signup error: ${error}`);
      return c.json({ error: `Signup failed: ${error}` }, 500);
    }
  });
}
