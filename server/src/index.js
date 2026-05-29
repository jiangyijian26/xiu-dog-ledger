import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import categoryRoutes from './routes/categories.js';
import billRoutes from './routes/bills.js';
import cycleRoutes from './routes/cycles.js';
import budgetRoutes from './routes/budgets.js';
import studentRoutes from './routes/student.js';
import dashboardRoutes from './routes/dashboard.js';
import statsRoutes from './routes/stats.js';
import localRoutes from './local-routes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './http.js';

// 环境变量验证
if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET');
}

const app = express();
// 确保端口是数字类型，优先使用Render的PORT环境变量
const port = Number(process.env.PORT || 4000);

// 安全与跨域配置
app.use(helmet());
// 优化CORS配置，支持多个前端域名
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN 
    ? process.env.CLIENT_ORIGIN.split(',') 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true, // 允许携带Cookie
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// 1. 根路径测试路由（解决访问根域名404问题）
app.get('/', (_req, res) => {
  res.send(`✅ Xiu Dog Ledger Server is running on port ${port}`);
});

// 2. 健康检查接口（与Render配置匹配）
app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    ok: true, 
    service: 'xiu-dog-ledger-server',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// 3. 保留原有的/health路径（向后兼容）
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'xiu-dog-ledger-server' });
});

// 路由配置（保持不变）
if (process.env.LOCAL_DEMO === 'true') {
  app.use('/api', localRoutes);
} else {
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', requireAuth, accountRoutes);
  app.use('/api/categories', requireAuth, categoryRoutes);
  app.use('/api/bills', requireAuth, billRoutes);
  app.use('/api/cycles', requireAuth, cycleRoutes);
  app.use('/api/budgets', requireAuth, budgetRoutes);
  app.use('/api/student', requireAuth, studentRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/stats', requireAuth, statsRoutes);
}

// 错误处理（保持不变）
app.use(notFound);
app.use(errorHandler);

// 启动服务器（优化日志输出）
app.listen(port, () => {
  console.log(`🚀 API server listening on port ${port}`);
  console.log(`🌐 Public URL: https://xiu-dog-ledger.onrender.com`);
  console.log(`🔍 Health check: https://xiu-dog-ledger.onrender.com/api/health`);
  if (process.env.LOCAL_DEMO === 'true') {
    console.log('⚠️ LOCAL_DEMO is enabled; data is stored in server/.local-data.json');
  }
});
