import { calculateCurrentCycle } from './cycles.js';

const expenseCategories = [
  ['食堂', 'utensils'],
  ['奶茶零食', 'coffee'],
  ['交通', 'bus'],
  ['学习文具', 'book'],
  ['话费', 'phone'],
  ['宿舍费', 'home'],
  ['娱乐', 'gamepad'],
  ['生活用品', 'shopping-bag']
];

const incomeCategories = [
  ['生活费', 'wallet'],
  ['兼职', 'briefcase'],
  ['奖学金', 'award'],
  ['退款', 'rotate-ccw']
];

export async function createUserDefaults(client, userId) {
  const accounts = [
    ['cash', '现金', 0, 1],
    ['wechat', '微信', 0, 2],
    ['alipay', '支付宝', 0, 3],
    ['bank', '银行卡', 0, 4],
    ['campus', '校园卡', 0, 5]
  ];

  for (const [type, name, balance, sort] of accounts) {
    await client.query(
      'insert into accounts (user_id, type, name, balance, sort_order) values ($1, $2, $3, $4, $5)',
      [userId, type, name, balance, sort]
    );
  }

  for (const [index, [name, icon]] of expenseCategories.entries()) {
    await client.query(
      'insert into categories (user_id, kind, name, icon, sort_order, is_system) values ($1, $2, $3, $4, $5, true)',
      [userId, 'expense', name, icon, index + 1]
    );
  }

  for (const [index, [name, icon]] of incomeCategories.entries()) {
    await client.query(
      'insert into categories (user_id, kind, name, icon, sort_order, is_system) values ($1, $2, $3, $4, $5, true)',
      [userId, 'income', name, icon, index + 1]
    );
  }

  const cycle = calculateCurrentCycle();
  await client.query(
    `insert into cycles (user_id, type, start_date, end_date, start_day, fixed_days, is_current)
     values ($1, $2, $3, $4, $5, $6, true)`,
    [userId, cycle.type, cycle.startDate, cycle.endDate, cycle.startDay, cycle.fixedDays]
  );

  await client.query(
    'insert into student_settings (user_id, enabled, allowance_day, allowance_amount, extra_income, allocation_method) values ($1, false, 1, 0, 0, $2)',
    [userId, 'monthly']
  );
}
