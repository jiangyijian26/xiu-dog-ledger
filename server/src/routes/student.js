import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncRoute } from '../http.js';
import { calculateCurrentCycle } from '../services/cycles.js';

const router = Router();

const schema = z.object({
  enabled: z.boolean(),
  allowanceDay: z.coerce.number().int().min(1).max(28),
  allowanceAmount: z.coerce.number().min(0),
  extraIncome: z.coerce.number().min(0).default(0),
  allocationMethod: z.enum(['monthly', 'weekly', 'category']).default('monthly')
});

router.get('/', asyncRoute(async (req, res) => {
  const result = await query(
    `select enabled, allowance_day as "allowanceDay", allowance_amount as "allowanceAmount",
            extra_income as "extraIncome", allocation_method as "allocationMethod"
     from student_settings where user_id = $1`,
    [req.user.id]
  );
  res.json({ studentSettings: result.rows[0] || null });
}));

router.put('/', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const settings = await transaction(async (client) => {
    const result = await client.query(
      `insert into student_settings (user_id, enabled, allowance_day, allowance_amount, extra_income, allocation_method)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id) do update set
         enabled = excluded.enabled,
         allowance_day = excluded.allowance_day,
         allowance_amount = excluded.allowance_amount,
         extra_income = excluded.extra_income,
         allocation_method = excluded.allocation_method,
         updated_at = now()
       returning enabled, allowance_day as "allowanceDay", allowance_amount as "allowanceAmount",
                 extra_income as "extraIncome", allocation_method as "allocationMethod"`,
      [req.user.id, input.enabled, input.allowanceDay, input.allowanceAmount, input.extraIncome, input.allocationMethod]
    );

    if (input.enabled) {
      const cycle = calculateCurrentCycle({ type: 'monthly_start', startDay: input.allowanceDay });
      await client.query('update cycles set is_current = false where user_id = $1', [req.user.id]);
      await client.query(
        `insert into cycles (user_id, type, start_date, end_date, start_day, fixed_days, is_current)
         values ($1, $2, $3, $4, $5, null, true)`,
        [req.user.id, cycle.type, cycle.startDate, cycle.endDate, cycle.startDay]
      );
    }

    return result.rows[0];
  });

  res.json({ studentSettings: settings });
}));

export default router;
