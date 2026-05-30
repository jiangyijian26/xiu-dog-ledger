import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  Dog,
  Flame,
  Home,
  Landmark,
  ListChecks,
  LogOut,
  Moon,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Target,
  Trash2,
  TrendingUp,
  Wallet
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { clearSession, getStoredUser, request, setSession } from './api.js';
import ashuCorgi from './assets/ashu-corgi.png';

const navItems = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'bills', label: '账单', icon: Wallet },
  { key: 'budget', label: '预算', icon: PieChart },
  { key: 'stats', label: '统计', icon: BarChart3 },
  { key: 'manage', label: '管理', icon: Settings }
];

const colors = ['#f6c85f', '#54b399', '#6b8afd', '#f27c7c', '#8c6ff0', '#38a3a5'];

function money(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function percent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function todayInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = mode === 'register' ? form : { email: form.email, password: form.password };
      const session = await request(`/auth/${mode}`, { method: 'POST', body: payload });
      setSession(session);
      onAuthed(session.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand-mark"><Dog size={38} /> 修狗记账</div>
        <h1>阿修陪你，把生活费花得明明白白。</h1>
        <p>为学生生活费、校园消费和轻量记账设计。每天打开，阿修都会帮你看预算、看余额、看今天还能安心花多少。</p>
        <div className="auth-highlights">
          <span><Sparkles size={17} /> 阿修今日建议</span>
          <span><Target size={17} /> 周期预算</span>
          <span><BookOpen size={17} /> 校园分类</span>
        </div>
        <div className="mascot-stage" aria-hidden="true">
          <div className="speech-bubble">今天先看预算，再决定奶茶要不要加料。</div>
          <img src={ashuCorgi} alt="" />
          <div className="campus-preview">
            <span>生活费周期</span>
            <strong>剩余 12 天</strong>
            <small>今日建议 ¥42.80</small>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="panel-kicker">开始使用</div>
        <h2>{mode === 'login' ? '欢迎回来' : '创建你的账本'}</h2>
        <p>{mode === 'login' ? '登录后继续管理今天的预算。' : '注册后会自动生成账户、分类和当前周期。'}</p>
        <form onSubmit={submit} className="stack">
          {mode === 'register' && (
            <label>
              昵称
              <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="阿修用户" />
            </label>
          )}
          <label>
            邮箱
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>
            密码
            <input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="至少 6 位" />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={loading}>{loading ? '处理中...' : mode === 'login' ? '登录' : '注册并初始化'}</button>
        </form>
        <button className="ghost wide" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? '创建新账号' : '已有账号，去登录'}
        </button>
      </section>
    </main>
  );
}

function BillForm({ accounts, categories, onCreated }) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    categoryId: '',
    accountId: '',
    targetAccountId: '',
    occurredAt: todayInput(),
    remark: ''
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const filteredCategories = categories.filter((item) => item.kind === form.type);

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await request('/bills', { method: 'POST', body: { ...form, amount: Number(form.amount) } });
      setForm({ ...form, amount: '', remark: '' });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="panel bill-form" onSubmit={submit}>
      <div className="panel-title bill-form-title">
        <div>
          <h3>快速记账</h3>
          <p>记完一笔，阿修会同步更新账户余额和本周期预算。</p>
        </div>
        <span className="soft-badge"><Dog size={15} /> 阿修助手</span>
      </div>
      <div className="segmented">
        {['expense', 'income', 'transfer'].map((type) => (
          <button type="button" key={type} className={form.type === type ? 'active' : ''} onClick={() => setForm({ ...form, type, categoryId: '' })}>
            {type === 'expense' ? '支出' : type === 'income' ? '收入' : '转账'}
          </button>
        ))}
      </div>
      <div className="form-grid">
        <label>
          金额
          <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </label>
        {form.type !== 'transfer' && (
          <label>
            分类
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">未分类</option>
              {filteredCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
        <label>
          {form.type === 'transfer' ? '转出账户' : '账户'}
          <select required value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
            <option value="">选择账户</option>
            {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {form.type === 'transfer' && (
          <label>
            转入账户
            <select required value={form.targetAccountId} onChange={(e) => setForm({ ...form, targetAccountId: e.target.value })}>
              <option value="">选择账户</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
        <label>
          时间
          <input type="datetime-local" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
        </label>
        <label>
          备注
          <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="食堂晚饭、公交..." />
        </label>
      </div>
      {error && <div className="error">{error}</div>}
      {saved && <div className="success-bark"><Dog size={17} /> 阿修已帮你记上啦</div>}
      <button className="primary"><Plus size={18} /> 记一笔</button>
    </form>
  );
}

function HomePage({ data, accounts, categories, reload }) {
  const cycle = data.dashboard?.cycle;
  const totals = data.dashboard?.totals || {};
  const recentBills = data.dashboard?.recentBills || [];
  const student = data.dashboard?.studentSettings;
  const totalBudget = Number(totals.totalBudget || 0);
  const expense = Number(totals.expense || 0);
  const remainingBudget = Number(totals.remainingBudget || 0);
  const budgetUsed = totalBudget > 0 ? Math.min((expense / totalBudget) * 100, 100) : 0;
  const accountTotal = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const dailyAvailable = Number(totals.dailyAvailable || 0);
  const budgetTone = budgetUsed >= 90 ? 'danger' : budgetUsed >= 70 ? 'warn' : 'good';
  const campusTags = ['食堂', '奶茶零食', '交通', '学习文具', '校园卡'];

  return (
    <div className="page-grid">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Dog size={18} /> 阿修今日建议</div>
          <h2>{dailyAvailable > 0 ? `今天安心花 ${money(dailyAvailable)}` : '先设预算，阿修给建议'}</h2>
          <p>{cycle ? `${cycle.startDate} 至 ${cycle.endDate}，剩余 ${cycle.remainingDays || 0} 天` : '还没有当前周期，去管理页设置一个记账周期。'}</p>
          <div className="hero-tags">
            <span>{student?.enabled ? '学生模式已开启' : '普通周期模式'}</span>
            <span>账户合计 {money(accountTotal)}</span>
            <span>预算剩余 {money(remainingBudget)}</span>
          </div>
          <div className="campus-tags">
            {campusTags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <div className="ashu-hero-side">
          <div className="ashu-helper">
            <img src={ashuCorgi} alt="阿修柯基预算助手" />
            <div className="ashu-tip">{budgetUsed >= 90 ? '预算快见底啦，今天少花一点。' : budgetUsed >= 70 ? '节奏有点快，阿修帮你盯着。' : '预算节奏不错，可以安心记录。'}</div>
          </div>
          <div className={`budget-radar ${budgetTone}`}>
            <span><ShieldCheck size={16} /> 预算使用率</span>
            <strong>{percent(budgetUsed)}</strong>
            <ProgressBar value={budgetUsed} />
            <small>已支出 {money(expense)} / 预算 {money(totalBudget)}</small>
          </div>
        </div>
      </section>

      <div className="metric-grid">
        <Metric icon={ArrowUpRight} title="周期收入" value={money(totals.income)} tone="green" />
        <Metric icon={ArrowDownRight} title="周期支出" value={money(expense)} tone="red" />
        <Metric icon={Target} title="周期预算" value={money(totalBudget)} tone="blue" />
        <Metric icon={Flame} title="预算剩余" value={money(remainingBudget)} tone="yellow" />
      </div>

      <div className="home-split">
        <BillForm accounts={accounts} categories={categories} onCreated={reload} />
        <section className="panel insight-panel">
          <div className="panel-title">
            <h3>本周期洞察</h3>
            <TrendingUp size={19} />
          </div>
          <InsightCard icon={ListChecks} label="账单记录" value={`${recentBills.length} 条近期记录`} />
          <InsightCard icon={Landmark} label="账户数量" value={`${accounts.length} 个账户可用`} />
          <InsightCard icon={PieChart} label="分类数量" value={`${categories.length} 个分类`} />
        </section>
      </div>

      <AccountRail accounts={accounts} />

      <section className="panel">
        <div className="panel-title">
          <h3>最近账单</h3>
          <button className="icon-btn" onClick={reload} title="刷新"><RefreshCw size={18} /></button>
        </div>
        <BillList bills={recentBills} compact />
      </section>
    </div>
  );
}

function ProgressBar({ value }) {
  return <div className="progress-track"><span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}

function Metric({ icon: Icon, title, value, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{Icon && <Icon size={18} />}{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value }) {
  return (
    <div className="insight-row">
      {Icon && <Icon size={18} />}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AccountRail({ accounts }) {
  if (!accounts.length) return null;
  return (
    <section className="account-rail">
      <div className="rail-heading">
        <span><CreditCard size={18} /> 账户快览</span>
        <strong>{money(accounts.reduce((sum, item) => sum + Number(item.balance || 0), 0))}</strong>
      </div>
      <div className="account-strip">
        {accounts.map((account) => (
          <div className="account-card" key={account.id}>
            <span>{account.name}</span>
            <strong>{money(account.balance)}</strong>
            <small>{account.type}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function BillList({ bills, onDelete, compact = false }) {
  if (!bills.length) return <EmptyState title="阿修还没闻到账单" text="记一笔食堂、奶茶或交通支出，让本周期看板动起来。" />;
  return (
    <div className="bill-list">
      {bills.map((bill) => (
        <div className="bill-row" key={bill.id}>
          <div>
            <strong>{bill.categoryName || (bill.type === 'transfer' ? '转账' : '未分类')}</strong>
            <span>{new Date(bill.occurredAt).toLocaleString()} · {bill.accountName || '无账户'} {bill.remark ? `· ${bill.remark}` : ''}</span>
          </div>
          <div className={bill.type === 'income' ? 'amount income' : bill.type === 'expense' ? 'amount expense' : 'amount'}>
            {bill.type === 'income' ? '+' : bill.type === 'expense' ? '-' : ''}{money(bill.amount)}
          </div>
          {!compact && onDelete && (
            <button className="icon-btn danger" title="删除" onClick={() => onDelete(bill.id)}><Trash2 size={17} /></button>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty themed-empty">
      <img src={ashuCorgi} alt="" />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function BillsPage({ bills, reload }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => bills.filter((bill) => `${bill.remark || ''}${bill.categoryName || ''}${bill.accountName || ''}`.includes(search)), [bills, search]);

  async function remove(id) {
    await request(`/bills/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h3>账单流水</h3>
        <label className="search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索备注、分类、账户" /></label>
      </div>
      <BillList bills={filtered} onDelete={remove} />
    </section>
  );
}

function BudgetPage({ budgets, categories, cycle, reload }) {
  const [form, setForm] = useState({ type: 'total', amount: '', categoryId: '' });

  async function submit(event) {
    event.preventDefault();
    await request('/budgets', { method: 'POST', body: { ...form, amount: Number(form.amount), cycleId: cycle?.id || null } });
    setForm({ ...form, amount: '' });
    reload();
  }

  async function remove(id) {
    await request(`/budgets/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <section className="panel">
      <div className="panel-title"><h3>预算管理</h3></div>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="total">总预算</option>
          <option value="category">分类预算</option>
        </select>
        {form.type === 'category' && (
          <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">选择分类</option>
            {categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="预算金额" />
        <button className="primary">保存</button>
      </form>
      <div className="tile-list">
        {budgets.length ? budgets.map((budget) => (
          <div className="tile" key={budget.id}>
            <span>{budget.type === 'total' ? '周期总预算' : budget.categoryName}</span>
            <strong>{money(budget.amount)}</strong>
            <button className="icon-btn danger" title="删除" onClick={() => remove(budget.id)}><Trash2 size={17} /></button>
          </div>
        )) : <EmptyState title="还没有预算" text="给阿修一个周期预算，它才能每天提醒你还能花多少。" />}
      </div>
    </section>
  );
}

function StatsPage({ stats }) {
  return (
    <div className="stats-grid">
      <section className="panel chart-panel">
        <h3>收支趋势</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.trend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="income" fill="#54b399" name="收入" />
            <Bar dataKey="expense" fill="#f27c7c" name="支出" />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="panel chart-panel">
        <h3>分类占比</h3>
        <ResponsiveContainer width="100%" height={260}>
          <RePieChart>
            <Pie data={stats.categories || []} dataKey="amount" nameKey="name" outerRadius={90} label>
              {(stats.categories || []).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip />
          </RePieChart>
        </ResponsiveContainer>
      </section>
      <section className="panel">
        <h3>账户余额</h3>
        <div className="tile-list">
          {(stats.accounts || []).map((account) => (
            <div className="tile" key={account.name}><span>{account.name}</span><strong>{money(account.balance)}</strong></div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ManagePage({ accounts, categories, student, cycle, reload }) {
  const [cycleForm, setCycleForm] = useState({ type: 'monthly_start', startDay: cycle?.startDay || 1, fixedDays: 30, startDate: new Date().toISOString().slice(0, 10) });
  const [studentForm, setStudentForm] = useState({
    enabled: Boolean(student?.enabled),
    allowanceDay: student?.allowanceDay || 1,
    allowanceAmount: student?.allowanceAmount || 0,
    extraIncome: student?.extraIncome || 0,
    allocationMethod: student?.allocationMethod || 'monthly'
  });

  useEffect(() => {
    setStudentForm({
      enabled: Boolean(student?.enabled),
      allowanceDay: student?.allowanceDay || 1,
      allowanceAmount: student?.allowanceAmount || 0,
      extraIncome: student?.extraIncome || 0,
      allocationMethod: student?.allocationMethod || 'monthly'
    });
  }, [student]);

  async function saveCycle(event) {
    event.preventDefault();
    await request('/cycles/current', { method: 'POST', body: cycleForm });
    reload();
  }

  async function saveStudent(event) {
    event.preventDefault();
    await request('/student', { method: 'PUT', body: { ...studentForm, allowanceAmount: Number(studentForm.allowanceAmount), extraIncome: Number(studentForm.extraIncome) } });
    reload();
  }

  return (
    <div className="manage-grid">
      <section className="panel">
        <h3>周期设置</h3>
        <form className="stack" onSubmit={saveCycle}>
          <label>周期类型
            <select value={cycleForm.type} onChange={(e) => setCycleForm({ ...cycleForm, type: e.target.value })}>
              <option value="natural_month">自然月</option>
              <option value="monthly_start">每月起始日</option>
              <option value="fixed_days">固定天数</option>
            </select>
          </label>
          {cycleForm.type === 'monthly_start' && <label>起始日<input type="number" min="1" max="28" value={cycleForm.startDay} onChange={(e) => setCycleForm({ ...cycleForm, startDay: e.target.value })} /></label>}
          {cycleForm.type === 'fixed_days' && (
            <div className="form-grid">
              <label>开始日期<input type="date" value={cycleForm.startDate} onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })} /></label>
              <label>天数<input type="number" min="1" max="366" value={cycleForm.fixedDays} onChange={(e) => setCycleForm({ ...cycleForm, fixedDays: e.target.value })} /></label>
            </div>
          )}
          <button className="primary"><CalendarDays size={18} /> 更新周期</button>
        </form>
      </section>

      <section className="panel">
        <h3>学生模式</h3>
        <form className="stack" onSubmit={saveStudent}>
          <label className="toggle"><input type="checkbox" checked={studentForm.enabled} onChange={(e) => setStudentForm({ ...studentForm, enabled: e.target.checked })} /> 开启学生模式</label>
          <div className="form-grid">
            <label>生活费发放日<input type="number" min="1" max="28" value={studentForm.allowanceDay} onChange={(e) => setStudentForm({ ...studentForm, allowanceDay: e.target.value })} /></label>
            <label>生活费金额<input type="number" min="0" step="0.01" value={studentForm.allowanceAmount} onChange={(e) => setStudentForm({ ...studentForm, allowanceAmount: e.target.value })} /></label>
            <label>额外收入<input type="number" min="0" step="0.01" value={studentForm.extraIncome} onChange={(e) => setStudentForm({ ...studentForm, extraIncome: e.target.value })} /></label>
            <label>分配方式
              <select value={studentForm.allocationMethod} onChange={(e) => setStudentForm({ ...studentForm, allocationMethod: e.target.value })}>
                <option value="monthly">按月均分</option>
                <option value="weekly">按周分配</option>
                <option value="category">按分类设置</option>
              </select>
            </label>
          </div>
          <button className="primary"><BookOpen size={18} /> 保存学生模式</button>
        </form>
      </section>

      <section className="panel">
        <h3>账户</h3>
        <div className="tile-list">{accounts.map((item) => <div className="tile" key={item.id}><CreditCard size={18} /><span>{item.name}</span><strong>{money(item.balance)}</strong></div>)}</div>
      </section>
      <section className="panel">
        <h3>分类</h3>
        <div className="chip-list">{categories.map((item) => <span className="chip" key={item.id}><Tags size={15} />{item.name}</span>)}</div>
      </section>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [active, setActive] = useState('home');
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [data, setData] = useState({ dashboard: null, accounts: [], categories: [], bills: [], budgets: [], stats: {} });

  const loadAll = useCallback(async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      const [dashboard, accounts, categories, bills, budgets, stats] = await Promise.all([
        request('/dashboard'),
        request('/accounts'),
        request('/categories'),
        request('/bills'),
        request('/budgets'),
        request('/stats')
      ]);
      setData({
        dashboard,
        accounts: accounts.accounts,
        categories: categories.categories,
        bills: bills.bills,
        budgets: budgets.budgets,
        stats
      });
    } catch (err) {
      setError(err.message);
      if (err.message.includes('登录')) {
        clearSession();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!user) return <AuthScreen onAuthed={setUser} />;

  const currentCycle = data.dashboard?.cycle;
  const student = data.dashboard?.studentSettings;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo"><Dog /> <span>修狗记账</span></div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => setActive(item.key)}><Icon size={19} />{item.label}</button>;
          })}
        </nav>
        <button className="ghost" onClick={() => { clearSession(); setUser(null); }}><LogOut size={18} /> 退出</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="sync-dot">同步成功</span>
            <h1>{navItems.find((item) => item.key === active)?.label}</h1>
            <p className="page-subtitle">今天的数据已经和云端账本保持一致</p>
          </div>
          <div className="top-actions">
            <span className="cloud-pill"><ShieldCheck size={16} /> Secure</span>
            <div className="user-box"><Moon size={18} /> {user.nickname}</div>
          </div>
        </header>
        {error && <div className="error">{error}</div>}
        {loading ? <div className="loading">加载中...</div> : (
          <>
            {active === 'home' && <HomePage data={data} accounts={data.accounts} categories={data.categories} reload={loadAll} />}
            {active === 'bills' && <BillsPage bills={data.bills} reload={loadAll} />}
            {active === 'budget' && <BudgetPage budgets={data.budgets} categories={data.categories} cycle={currentCycle} reload={loadAll} />}
            {active === 'stats' && <StatsPage stats={data.stats} />}
            {active === 'manage' && <ManagePage accounts={data.accounts} categories={data.categories} student={student} cycle={currentCycle} reload={loadAll} />}
          </>
        )}
      </main>
    </div>
  );
}
