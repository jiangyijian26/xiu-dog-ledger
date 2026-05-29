import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../http.js';
import { daysRemaining } from '../services/cycles.js';

const router = Router();

router.get('/', asyncRoute(async (req, res) => {
  const cycleResult = await query(
    `select id, type, start_date as "startDate", end_date as "endDate",
            start_day as "startDay", fixed_days as "fixedDays"
     from cycles where user_id = $1 and is_current = true order by created_at desc limit 1`,
    [req.user.id]
  );
  const cycle = cycleResult.rows[0];

  const totalsResult = cycle
    ? await query(
      `select
         coalesce(sum(amount) filter (where type = 'income'), 0) as income,
         coalesce(sum(amount) filter (where type = 'expense'), 0) as expense
       from bills
       where user_id = $1 and occurred_at::date between $2 and $3`,
      [req.user.id, cycle.startDate, cycle.endDate]
    )
    : { rows: [{ income: 0, expense: 0 }] };

  const budgetResult = await query(
    `select coalesce(sum(amount) filter (where type = 'total'), 0) as total
     from budgets where user_id = $1 and ($2::uuid is null or cycle_id = $2)`,
    [req.user.id, cycle?.id || null]
  );

  const recentResult = await query(
    `select b.id, b.type, b.amount, c.name as "categoryName", a.name as "accountName",
            b.occurred_at as "occurredAt", b.remark
     from bills b
     left join categories c on c.id = b.category_id
     left join accounts a on a.id = b.account_id
     where b.user_id = $1
     order by b.occurred_at desc, b.created_at desc
     limit 8`,
    [req.user.id]
  );

  const studentResult = await query(
    `select enabled, allowance_day as "allowanceDay", allowance_amount as "allowanceAmount",
            extra_income as "extraIncome", allocation_method as "allocationMethod"
     from student_settings where user_id = $1`,
    [req.user.id]
  );

  const totals = totalsResult.rows[0];
  const totalBudget = Number(budgetResult.rows[0].total || 0);
  const expense = Number(totals.expense || 0);
  const remainingBudget = Math.max(totalBudget - expense, 0);
  const remainingDays = cycle ? daysRemaining(cycle.endDate) : 0;

  res.json({
    cycle: cycle ? { ...cycle, remainingDays } : null,
    totals: {
      income: Number(totals.income || 0),
      expense,
      totalBudget,
      remainingBudget,
      dailyAvailable: remainingDays > 0 ? Number((remainingBudget / remainingDays).toFixed(2)) : remainingBudget
    },
    recentBills: recentResult.rows,
    studentSettings: studentResult.rows[0] || null
  });
}));

export default router;
