// P1b · Prisma 配置（Prisma 7）· 终审 R3：连接串改 env 注入，源码零主机硬编码
// DATABASE_URL 必须包含 schema=musai，例如：
//   postgresql://yanyu@localhost:5433/yyc3_music?schema=musai
// （缺省时报错指引，不回退任何默认连接——避免误连本机/生产）

import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "[prisma.config] 缺少 DATABASE_URL 环境变量（需包含 ?schema=musai）。" +
      "在 .env / deploy musai-server.env 中配置后重试。",
  );
}

export default defineConfig({
  datasource: { url },
  schema: "./prisma/schema.prisma",
});
