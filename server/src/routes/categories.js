import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncRoute, HttpError } from '../http.js';

const router = Router();

const schema = z.object({
  kind: z.enum(['income', 'expense']),
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(40).default('tag'),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0)
});

router.get('/', asyncRoute(async (req, res) => {
  const result = await query(
    `select id, kind, name, icon, parent_id as "parentId", sort_order as "sortOrder", is_system as "isSystem"
     from categories where user_id = $1 order by kind, sort_order, created_at`,
    [req.user.id]
  );
  res.json({ categories: result.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const result = await query(
    `insert into categories (user_id, kind, name, icon, parent_id, sort_order)
     values ($1, $2, $3, $4, $5, $6)
     returning id, kind, name, icon, parent_id as "parentId", sort_order as "sortOrder", is_system as "isSystem"`,
    [req.user.id, input.kind, input.name, input.icon, input.parentId || null, input.sortOrder]
  );
  res.status(201).json({ category: result.rows[0] });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const input = schema.partial().parse(req.body);
  const current = await query('select * from categories where id = $1 and user_id = $2', [req.params.id, req.user.id]);
  if (!current.rowCount) throw new HttpError(404, '分类不存在');
  const next = { ...current.rows[0], ...input, parent_id: input.parentId ?? current.rows[0].parent_id, sort_order: input.sortOrder ?? current.rows[0].sort_order };
  const result = await query(
    `update categories set kind = $1, name = $2, icon = $3, parent_id = $4, sort_order = $5, updated_at = now()
     where id = $6 and user_id = $7
     returning id, kind, name, icon, parent_id as "parentId", sort_order as "sortOrder", is_system as "isSystem"`,
    [next.kind, next.name, next.icon, next.parent_id, next.sort_order, req.params.id, req.user.id]
  );
  res.json({ category: result.rows[0] });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await query('delete from categories where id = $1 and user_id = $2 returning id', [req.params.id, req.user.id]);
  if (!result.rowCount) throw new HttpError(404, '分类不存在');
  res.status(204).end();
}));

export default router;
