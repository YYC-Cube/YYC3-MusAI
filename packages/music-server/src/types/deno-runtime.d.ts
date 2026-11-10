/**
 * Deno 运行时类型桥接（仅用于 IDE / tsc 静态检查）
 *
 * music-server 是 Deno 部署单元，`deno check` 才是权威校验。
 * 这里把 Deno 的 `npm:` / `jsr:` 说明符映射到本地已安装的真实类型包，
 * 并补齐 `Deno` 全局，避免编辑器把它们当成无法解析的模块。
 * 不改变任何运行时行为。
 */

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
  };

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string; signal?: AbortSignal },
  ): unknown;

  function serve(
    options: { port?: number; hostname?: string; signal?: AbortSignal },
    handler: (request: Request) => Response | Promise<Response>,
  ): unknown;
}

// 已安装真实类型的依赖：转出类型
declare module "npm:zod@3.23.8" {
  export * from "zod";
}
declare module "npm:hono" {
  export * from "hono";
}
declare module "npm:hono/cors" {
  export * from "hono/cors";
}
declare module "npm:hono/logger" {
  export * from "hono/logger";
}
declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
declare module "jsr:@supabase/supabase-js@2.49.8" {
  export * from "@supabase/supabase-js";
}

// 无本地类型声明（运行时由 Deno 直接解析）
declare module "npm:pg@8.13.1";
declare module "https:*";
