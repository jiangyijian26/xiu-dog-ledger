import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncRoute } from '../http.js';
import { calculateCurrentCycle } from '../services/cycles.js';

const router = Router();

const schema = z.object({
  type: z.enum(['natural_month', 'monthly_start', 'fixed_days']),
  startDay: z.coerce.number().int().min(1).max(28).optional(),
  startDate: z.string().optional(),
  fixedDays: z.coerce.number().int().min(1).max(366).optional()
});

router.get('/current', asyncRoute(async (req, res) => {
  const result = await query(
    `select id, type, start_date as "startDate", end_date as "endDate",
            start_day as "startDay", fixed_days as "fixedDays", is_current as "isCurrent"
     from cycles where user_id = $1 and is_current = true order by created_at desc limit 1`,
    [req.user.id]
  );
  res.json({ cycle: result.rows[0] || null });
}));

router.post('/current', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const cycle = calculateCurrentCycle(input);
  const created = await transaction(async (client) => {
    await client.query('update cycles set is_current = false where user_id = $1', [req.user.id]);
    const result = await client.query(
      `insert into cycles (user_id, type, start_date, end_date, start_day, fixed_days, is_current)
       values ($1, $2, $3, $4, $5, $6, true)
       returning id, type, start_date as "startDate", end_date as "endDate", start_day as "startDay", fixed_days as "fixedDays", is_current as "isCurrent"`,
      [req.user.id, cycle.type, cycle.startDate, cycle.endDate, cycle.startDay, cycle.fixedDays]
    );
    return result.rows[0];
  });
  res.status(201).json({ cycle: created });
}));

export default router;
