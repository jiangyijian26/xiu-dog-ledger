import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../http.js';

const router = Router();

router.get('/', asyncRoute(async (req, res) => {
  const cycleResult = await query(
    'select start_date, end_date from cycles where user_id = $1 and is_current = true order by created_at desc limit 1',
    [req.user.id]
  );
  const cycle = cycleResult.rows[0];

  const range = [
    req.user.id,
    req.query.from || cycle?.start_date,
    req.query.to || cycle?.end_date
  ];

  const trend = await query(
    `select occurred_at::date as day,
            coalesce(sum(amount) filter (where type = 'income'), 0) as income,
            coalesce(sum(amount) filter (where type = 'expense'), 0) as expense
     from bills
     where user_id = $1 and occurred_at::date between $2 and $3
     group by occurred_at::date
     order by day`,
    range
  );

  const categories = await query(
    `select c.name, coalesce(sum(b.amount), 0) as amount
     from bills b
     left join categories c on c.id = b.category_id
     where b.user_id = $1 and b.type = 'expense' and b.occurred_at::date between $2 and $3
     group by c.name
     order by amount desc`,
    range
  );

  const accounts = await query(
    `select type, name, balance from accounts where user_id = $1 order by sort_order, created_at`,
    [req.user.id]
  );

  res.json({ trend: trend.rows, categories: categories.rows, accounts: accounts.rows });
}));

export default router;
