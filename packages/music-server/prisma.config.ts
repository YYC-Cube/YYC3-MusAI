// P1b · Prisma 配置（Prisma 7）
// DATABASE_URL 必须包含 schema=musai，例如：
//   postgresql://yanyu@localhost:5433/yyc3_music?schema=musai

import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: "postgresql://yanyu@localhost:5433/yyc3_music?schema=musai",
  },
  schema: "./prisma/schema.prisma",
});
