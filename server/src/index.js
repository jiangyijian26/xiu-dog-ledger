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

if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET');
}

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'xiu-dog-ledger-server' });
});

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

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
  if (process.env.LOCAL_DEMO === 'true') {
    console.log('LOCAL_DEMO is enabled; data is stored in server/.local-data.json');
  }
});
