import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncRoute, HttpError } from '../http.js';

const router = Router();

const schema = z.object({
  type: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(40),
  balance: z.coerce.number().default(0),
  sortOrder: z.coerce.number().int().default(0)
});

router.get('/', asyncRoute(async (req, res) => {
  const result = await query(
    'select id, type, name, balance, sort_order as "sortOrder" from accounts where user_id = $1 order by sort_order, created_at',
    [req.user.id]
  );
  res.json({ accounts: result.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const result = await query(
    `insert into accounts (user_id, type, name, balance, sort_order)
     values ($1, $2, $3, $4, $5)
     returning id, type, name, balance, sort_order as "sortOrder"`,
    [req.user.id, input.type, input.name, input.balance, input.sortOrder]
  );
  res.status(201).json({ account: result.rows[0] });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const input = schema.partial().parse(req.body);
  const current = await query('select * from accounts where id = $1 and user_id = $2', [req.params.id, req.user.id]);
  if (!current.rowCount) throw new HttpError(404, '账户不存在');
  const next = { ...current.rows[0], ...input, sort_order: input.sortOrder ?? current.rows[0].sort_order };
  const result = await query(
    `update accounts set type = $1, name = $2, balance = $3, sort_order = $4, updated_at = now()
     where id = $5 and user_id = $6
     returning id, type, name, balance, sort_order as "sortOrder"`,
    [next.type, next.name, next.balance, next.sort_order, req.params.id, req.user.id]
  );
  res.json({ account: result.rows[0] });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await query('delete from accounts where id = $1 and user_id = $2 returning id', [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, '账户不存在');
  res.status(204).end();
}));

export default router;
