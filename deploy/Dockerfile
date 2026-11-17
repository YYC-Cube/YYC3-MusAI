# ================================================================================
# YYC³ MusAI Server —— 生产镜像（Node 20 + pnpm workspace）
#
# 构建上下文：仓库根目录
#   docker build -f deploy/Dockerfile -t yyc3/musai-server:<tag> .
# ================================================================================
ARG NODE_VERSION=20

# --------------------------------------------------------------------------------
# 构建阶段：安装依赖 → 编译 TS → pnpm deploy 产出运行时目录
# --------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/music-server/package.json packages/music-server/package.json
RUN pnpm install --filter @yyc3/music-server... --frozen-lockfile --ignore-scripts

COPY packages/music-server packages/music-server
RUN pnpm --filter @yyc3/music-server build \
 && pnpm --filter @yyc3/music-server deploy --prod --legacy /out

# --------------------------------------------------------------------------------
# 运行阶段：仅保留 dist + 生产依赖，非 root 运行
# --------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

RUN addgroup -S musai && adduser -S musai -G musai
WORKDIR /app

COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/packages/music-server/dist ./dist

USER musai
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

LABEL org.opencontainers.image.title="yyc3-musai-server" \
      org.opencontainers.image.description="YYC³ MusAI REST API (Hono + PostgreSQL 15)" \
      org.opencontainers.image.source="https://github.com/YYC-Cube/YYC3-MusAI"

CMD ["node", "dist/index.js"]
