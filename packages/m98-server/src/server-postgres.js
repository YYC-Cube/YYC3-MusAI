/**
 * file: server-postgres.js
 * description: M98 API 服务（PostgreSQL 主入口）· 路由、健康检查与优雅关闭
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[api],[postgres],[entry]
 *
 * dependencies: express, helmet, cors, express-rate-limit, swagger, db/postgres
 * exports: app, start
 * notes: 唯一服务入口；Mongo / SQLite / Mock 入口已下线
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { health, close, SCHEMA } = require('./db/postgres');

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(
  cors({
    origin: (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((item) => item.trim()),
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'M98 API (PostgreSQL)',
      version: '1.0.0',
      description: '董小姐(M98)官方 API 服务 · PostgreSQL 15 适配层',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: '开发环境' }],
  },
  apis: [
    './src/routes/pg/*.js',
    './src/routes/authRoutes.js',
  ],
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));

app.get('/health', async (req, res) => {
  try {
    const db = await health();
    const ok = db.ok;
    res.status(ok ? 200 : 503).json({
      status: ok ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'M98 API Service',
      version: '1.0.0',
      database: 'PostgreSQL',
      schema: SCHEMA,
      latencyMs: db.latencyMs,
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'M98 API Service',
      database: 'PostgreSQL',
      message: '数据库健康检查失败',
    });
  }
});

app.use('/api/artist', require('./routes/pg/artistRoutes'));
app.use('/api/music', require('./routes/pg/musicRoutes'));
app.use('/api/fans', require('./routes/pg/fanRoutes'));
app.use('/api/content', require('./routes/pg/contentRoutes'));
app.use('/api/auth', require('./routes/authRoutes')());
app.use('/api/admin', require('./routes/pg/adminRoutes'));

app.use('*', (req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

let server = null;

async function start() {
  const db = await health();
  if (!db.ok) {
    throw new Error('PostgreSQL 健康检查失败');
  }

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`M98 API (PostgreSQL) 启动成功，端口: ${PORT}`);
      console.log(`API 文档: http://localhost:${PORT}/docs`);
      console.log(`Schema: ${SCHEMA}`);
      resolve(server);
    });
  });
}

async function shutdown(signal) {
  console.log(`\n收到 ${signal}，正在关闭服务...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await close();
  process.exit(0);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('服务启动失败:', error.message);
    process.exit(1);
  });

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { app, start };
