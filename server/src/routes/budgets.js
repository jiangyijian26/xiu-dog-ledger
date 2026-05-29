import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncRoute, HttpError } from '../http.js';

const router = Router();

const schema = z.object({
  cycleId: z.string().uuid().optional().nullable(),
  type: z.enum(['total', 'category']),
  amount: z.coerce.number().min(0),
  categoryId: z.string().uuid().optional().nullable()
});

router.get('/', asyncRoute(async (req, res) => {
  const result = await query(
    `select b.id, b.cycle_id as "cycleId", b.type, b.amount, b.category_id as "categoryId", c.name as "categoryName"
     from budgets b left join categories c on c.id = b.category_id
     where b.user_id = $1 order by b.created_at desc`,
    [req.user.id]
  );
  res.json({ budgets: result.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  if (input.type === 'category' && !input.categoryId) throw new HttpError(400, '分类预算需要选择分类');
  const result = await query(
    `insert into budgets (user_id, cycle_id, type, amount, category_id)
     values ($1, $2, $3, $4, $5)
     returning id, cycle_id as "cycleId", type, amount, category_id as "categoryId"`,
    [req.user.id, input.cycleId || null, input.type, input.amount, input.categoryId || null]
  );
  res.status(201).json({ budget: result.rows[0] });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await query('delete from budgets where id = $1 and user_id = $2 returning id', [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, '预算不存在');
  res.status(204).end();
}));

export default router;
