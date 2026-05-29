import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  Dog,
  Home,
  LogOut,
  Moon,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tags,
  Trash2,
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
      <section className="auth-panel">
        <div className="brand-mark"><Dog size={36} /> 阿修</div>
        <h1>修狗记账</h1>
        <p>按真实生活费周期管理账单、预算和校园消费。</p>
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

  const filteredCategories = categories.filter((item) => item.kind === form.type);

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await request('/bills', { method: 'POST', body: { ...form, amount: Number(form.amount) } });
      setForm({ ...form, amount: '', remark: '' });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="panel bill-form" onSubmit={submit}>
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
      <button className="primary"><Plus size={18} /> 记一笔</button>
    </form>
  );
}

function HomePage({ data, accounts, categories, reload }) {
  const cycle = data.dashboard?.cycle;
  const totals = data.dashboard?.totals || {};
  const recentBills = data.dashboard?.recentBills || [];
  const student = data.dashboard?.studentSettings;

  return (
    <div className="page-grid">
      <section className="hero-band">
        <div>
          <div className="eyebrow"><Dog size={18} /> 当前周期</div>
          <h2>{cycle ? `${cycle.startDate} 至 ${cycle.endDate}` : '未设置周期'}</h2>
          <p>{student?.enabled ? `生活费周期已开启，剩余 ${cycle?.remainingDays || 0} 天` : `剩余 ${cycle?.remainingDays || 0} 天，按当前账单周期统计`}</p>
        </div>
        <div className="daily-pill">今日建议 {money(totals.dailyAvailable)}</div>
      </section>

      <div className="metric-grid">
        <Metric title="周期收入" value={money(totals.income)} tone="green" />
        <Metric title="周期支出" value={money(totals.expense)} tone="red" />
        <Metric title="周期预算" value={money(totals.totalBudget)} tone="blue" />
        <Metric title="预算剩余" value={money(totals.remainingBudget)} tone="yellow" />
      </div>

      <BillForm accounts={accounts} categories={categories} onCreated={reload} />

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

function Metric({ title, value, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BillList({ bills, onDelete, compact = false }) {
  if (!bills.length) return <div className="empty">暂无账单</div>;
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
        {budgets.map((budget) => (
          <div className="tile" key={budget.id}>
            <span>{budget.type === 'total' ? '周期总预算' : budget.categoryName}</span>
            <strong>{money(budget.amount)}</strong>
            <button className="icon-btn danger" title="删除" onClick={() => remove(budget.id)}><Trash2 size={17} /></button>
          </div>
        ))}
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
          </div>
          <div className="user-box"><Moon size={18} /> {user.nickname}</div>
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
