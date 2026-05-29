import { Router } from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { asyncRoute, HttpError } from './http.js';
import { requireAuth, signToken } from './middleware/auth.js';
import { calculateCurrentCycle, daysRemaining } from './services/cycles.js';

const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.local-data.json');
const router = Router();

const baseData = {
  users: [],
  accounts: [],
  categories: [],
  bills: [],
  budgets: [],
  cycles: [],
  studentSettings: []
};

const expenseCategories = ['食堂', '奶茶零食', '交通', '学习文具', '话费', '宿舍费', '娱乐', '生活用品'];
const incomeCategories = ['生活费', '兼职', '奖学金', '退款'];

async function readData() {
  try {
    return JSON.parse(await readFile(dataPath, 'utf8'));
  } catch {
    return structuredClone(baseData);
  }
}

async function saveData(data) {
  await mkdir(dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(data, null, 2));
}

function publicUser(user) {
  return { id: user.id, email: user.email, nickname: user.nickname, avatarUrl: user.avatarUrl || null, bio: user.bio || null };
}

function seedDefaults(data, userId) {
  const accounts = [
    ['cash', '现金'],
    ['wechat', '微信'],
    ['alipay', '支付宝'],
    ['bank', '银行卡'],
    ['campus', '校园卡']
  ];
  accounts.forEach(([type, name], index) => data.accounts.push({ id: randomUUID(), userId, type, name, balance: 0, sortOrder: index + 1 }));
  expenseCategories.forEach((name, index) => data.categories.push({ id: randomUUID(), userId, kind: 'expense', name, icon: 'tag', sortOrder: index + 1, isSystem: true }));
  incomeCategories.forEach((name, index) => data.categories.push({ id: randomUUID(), userId, kind: 'income', name, icon: 'wallet', sortOrder: index + 1, isSystem: true }));
  const cycle = calculateCurrentCycle();
  data.cycles.push({ id: randomUUID(), userId, ...cycle, isCurrent: true });
  data.studentSettings.push({ userId, enabled: false, allowanceDay: 1, allowanceAmount: 0, extraIncome: 0, allocationMethod: 'monthly' });
}

function own(items, userId) {
  return items.filter((item) => item.userId === userId);
}

function currentCycle(data, userId) {
  return own(data.cycles, userId).find((cycle) => cycle.isCurrent) || null;
}

function adjustBalance(data, userId, bill, direction) {
  const amount = Number(bill.amount) * direction;
  const source = data.accounts.find((item) => item.id === bill.accountId && item.userId === userId);
  const target = data.accounts.find((item) => item.id === bill.targetAccountId && item.userId === userId);
  if (bill.type === 'income' && source) source.balance += amount;
  if (bill.type === 'expense' && source) source.balance -= amount;
  if (bill.type === 'transfer') {
    if (source) source.balance -= amount;
    if (target) target.balance += amount;
  }
}

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().trim().min(1).max(30).optional()
});

router.post('/auth/register', asyncRoute(async (req, res) => {
  const input = authSchema.parse(req.body);
  const data = await readData();
  if (data.users.some((user) => user.email === input.email)) throw new HttpError(409, '邮箱已注册');
  const user = { id: randomUUID(), email: input.email, passwordHash: await bcrypt.hash(input.password, 10), nickname: input.nickname || '阿修用户' };
  data.users.push(user);
  seedDefaults(data, user.id);
  await saveData(data);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/auth/login', asyncRoute(async (req, res) => {
  const input = authSchema.pick({ email: true, password: true }).parse(req.body);
  const data = await readData();
  const user = data.users.find((item) => item.email === input.email);
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError(401, '邮箱或密码错误');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const data = await readData();
  const user = data.users.find((item) => item.id === req.user.id);
  if (!user) throw new HttpError(404, '用户不存在');
  res.json({ user: publicUser(user) });
}));

router.use(requireAuth);

router.get('/accounts', asyncRoute(async (req, res) => {
  const data = await readData();
  res.json({ accounts: own(data.accounts, req.user.id).sort((a, b) => a.sortOrder - b.sortOrder) });
}));

router.get('/categories', asyncRoute(async (req, res) => {
  const data = await readData();
  res.json({ categories: own(data.categories, req.user.id).sort((a, b) => a.sortOrder - b.sortOrder) });
}));

router.get('/cycles/current', asyncRoute(async (req, res) => {
  const data = await readData();
  res.json({ cycle: currentCycle(data, req.user.id) });
}));

router.post('/cycles/current', asyncRoute(async (req, res) => {
  const input = z.object({
    type: z.enum(['natural_month', 'monthly_start', 'fixed_days']),
    startDay: z.coerce.number().int().min(1).max(28).optional(),
    startDate: z.string().optional(),
    fixedDays: z.coerce.number().int().min(1).max(366).optional()
  }).parse(req.body);
  const data = await readData();
  data.cycles.forEach((cycle) => { if (cycle.userId === req.user.id) cycle.isCurrent = false; });
  const cycle = { id: randomUUID(), userId: req.user.id, ...calculateCurrentCycle(input), isCurrent: true };
  data.cycles.push(cycle);
  await saveData(data);
  res.status(201).json({ cycle });
}));

router.get('/bills', asyncRoute(async (req, res) => {
  const data = await readData();
  const bills = own(data.bills, req.user.id)
    .map((bill) => ({
      ...bill,
      categoryName: data.categories.find((item) => item.id === bill.categoryId)?.name || null,
      accountName: data.accounts.find((item) => item.id === bill.accountId)?.name || null,
      targetAccountName: data.accounts.find((item) => item.id === bill.targetAccountId)?.name || null
    }))
    .filter((bill) => !req.query.search || `${bill.remark || ''}${bill.categoryName || ''}${bill.accountName || ''}`.includes(req.query.search))
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  res.json({ bills });
}));

router.post('/bills', asyncRoute(async (req, res) => {
  const input = z.object({
    type: z.enum(['income', 'expense', 'transfer']),
    amount: z.coerce.number().positive(),
    categoryId: z.string().nullable().optional(),
    accountId: z.string().nullable().optional(),
    targetAccountId: z.string().nullable().optional(),
    occurredAt: z.string(),
    remark: z.string().optional().default('')
  }).parse(req.body);
  const data = await readData();
  const bill = { id: randomUUID(), userId: req.user.id, ...input };
  data.bills.push(bill);
  adjustBalance(data, req.user.id, bill, 1);
  await saveData(data);
  res.status(201).json({ bill });
}));

router.delete('/bills/:id', asyncRoute(async (req, res) => {
  const data = await readData();
  const index = data.bills.findIndex((bill) => bill.id === req.params.id && bill.userId === req.user.id);
  if (index === -1) throw new HttpError(404, '账单不存在');
  const [bill] = data.bills.splice(index, 1);
  adjustBalance(data, req.user.id, bill, -1);
  await saveData(data);
  res.status(204).end();
}));

router.get('/budgets', asyncRoute(async (req, res) => {
  const data = await readData();
  const budgets = own(data.budgets, req.user.id).map((budget) => ({
    ...budget,
    categoryName: data.categories.find((item) => item.id === budget.categoryId)?.name || null
  }));
  res.json({ budgets });
}));

router.post('/budgets', asyncRoute(async (req, res) => {
  const input = z.object({
    cycleId: z.string().nullable().optional(),
    type: z.enum(['total', 'category']),
    amount: z.coerce.number().min(0),
    categoryId: z.string().nullable().optional()
  }).parse(req.body);
  const data = await readData();
  const budget = { id: randomUUID(), userId: req.user.id, ...input };
  data.budgets.push(budget);
  await saveData(data);
  res.status(201).json({ budget });
}));

router.delete('/budgets/:id', asyncRoute(async (req, res) => {
  const data = await readData();
  data.budgets = data.budgets.filter((budget) => !(budget.id === req.params.id && budget.userId === req.user.id));
  await saveData(data);
  res.status(204).end();
}));

router.get('/student', asyncRoute(async (req, res) => {
  const data = await readData();
  res.json({ studentSettings: data.studentSettings.find((item) => item.userId === req.user.id) || null });
}));

router.put('/student', asyncRoute(async (req, res) => {
  const input = z.object({
    enabled: z.boolean(),
    allowanceDay: z.coerce.number().int().min(1).max(28),
    allowanceAmount: z.coerce.number().min(0),
    extraIncome: z.coerce.number().min(0),
    allocationMethod: z.enum(['monthly', 'weekly', 'category'])
  }).parse(req.body);
  const data = await readData();
  data.studentSettings = data.studentSettings.filter((item) => item.userId !== req.user.id);
  const studentSettings = { userId: req.user.id, ...input };
  data.studentSettings.push(studentSettings);
  if (input.enabled) {
    data.cycles.forEach((cycle) => { if (cycle.userId === req.user.id) cycle.isCurrent = false; });
    data.cycles.push({ id: randomUUID(), userId: req.user.id, ...calculateCurrentCycle({ type: 'monthly_start', startDay: input.allowanceDay }), isCurrent: true });
  }
  await saveData(data);
  res.json({ studentSettings });
}));

router.get('/dashboard', asyncRoute(async (req, res) => {
  const data = await readData();
  const cycle = currentCycle(data, req.user.id);
  const bills = own(data.bills, req.user.id);
  const inCycle = cycle ? bills.filter((bill) => bill.occurredAt.slice(0, 10) >= cycle.startDate && bill.occurredAt.slice(0, 10) <= cycle.endDate) : [];
  const income = inCycle.filter((bill) => bill.type === 'income').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const expense = inCycle.filter((bill) => bill.type === 'expense').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const totalBudget = own(data.budgets, req.user.id).filter((budget) => budget.type === 'total' && (!cycle || budget.cycleId === cycle.id)).reduce((sum, budget) => sum + Number(budget.amount), 0);
  const remainingDays = cycle ? daysRemaining(cycle.endDate) : 0;
  const remainingBudget = Math.max(totalBudget - expense, 0);
  const recentBills = bills.slice().sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 8).map((bill) => ({
    ...bill,
    categoryName: data.categories.find((item) => item.id === bill.categoryId)?.name || null,
    accountName: data.accounts.find((item) => item.id === bill.accountId)?.name || null
  }));
  res.json({
    cycle: cycle ? { ...cycle, remainingDays } : null,
    totals: { income, expense, totalBudget, remainingBudget, dailyAvailable: remainingDays ? Number((remainingBudget / remainingDays).toFixed(2)) : remainingBudget },
    recentBills,
    studentSettings: data.studentSettings.find((item) => item.userId === req.user.id) || null
  });
}));

router.get('/stats', asyncRoute(async (req, res) => {
  const data = await readData();
  const bills = own(data.bills, req.user.id);
  const trendMap = new Map();
  const categoryMap = new Map();
  for (const bill of bills) {
    const day = bill.occurredAt.slice(0, 10);
    const trend = trendMap.get(day) || { day, income: 0, expense: 0 };
    if (bill.type === 'income') trend.income += Number(bill.amount);
    if (bill.type === 'expense') {
      trend.expense += Number(bill.amount);
      const name = data.categories.find((item) => item.id === bill.categoryId)?.name || '未分类';
      categoryMap.set(name, (categoryMap.get(name) || 0) + Number(bill.amount));
    }
    trendMap.set(day, trend);
  }
  res.json({
    trend: [...trendMap.values()].sort((a, b) => a.day.localeCompare(b.day)),
    categories: [...categoryMap.entries()].map(([name, amount]) => ({ name, amount })),
    accounts: own(data.accounts, req.user.id)
  });
}));

export default router;
