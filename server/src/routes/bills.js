import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncRoute, HttpError } from '../http.js';

const router = Router();

const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive(),
  categoryId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  targetAccountId: z.string().uuid().nullable().optional(),
  occurredAt: z.coerce.date(),
  remark: z.string().trim().max(200).optional().default('')
});

async function adjustBalances(client, userId, bill, direction) {
  const amount = Number(bill.amount) * direction;
  if (bill.type === 'income' && bill.account_id) {
    await client.query('update accounts set balance = balance + $1, updated_at = now() where id = $2 and user_id = $3', [amount, bill.account_id, userId]);
  }
  if (bill.type === 'expense' && bill.account_id) {
    await client.query('update accounts set balance = balance - $1, updated_at = now() where id = $2 and user_id = $3', [amount, bill.account_id, userId]);
  }
  if (bill.type === 'transfer' && bill.account_id && bill.target_account_id) {
    await client.query('update accounts set balance = balance - $1, updated_at = now() where id = $2 and user_id = $3', [amount, bill.account_id, userId]);
    await client.query('update accounts set balance = balance + $1, updated_at = now() where id = $2 and user_id = $3', [amount, bill.target_account_id, userId]);
  }
}

router.get('/', asyncRoute(async (req, res) => {
  const values = [req.user.id];
  const where = ['b.user_id = $1'];

  if (req.query.type) {
    values.push(req.query.type);
    where.push(`b.type = $${values.length}`);
  }
  if (req.query.categoryId) {
    values.push(req.query.categoryId);
    where.push(`b.category_id = $${values.length}`);
  }
  if (req.query.accountId) {
    values.push(req.query.accountId);
    where.push(`(b.account_id = $${values.length} or b.target_account_id = $${values.length})`);
  }
  if (req.query.from) {
    values.push(req.query.from);
    where.push(`b.occurred_at >= $${values.length}`);
  }
  if (req.query.to) {
    values.push(req.query.to);
    where.push(`b.occurred_at <= $${values.length}`);
  }
  if (req.query.search) {
    values.push(`%${req.query.search}%`);
    where.push(`coalesce(b.remark, '') ilike $${values.length}`);
  }

  const result = await query(
    `select b.id, b.type, b.amount, b.category_id as "categoryId", c.name as "categoryName",
            b.account_id as "accountId", a.name as "accountName",
            b.target_account_id as "targetAccountId", ta.name as "targetAccountName",
            b.occurred_at as "occurredAt", b.remark
     from bills b
     left join categories c on c.id = b.category_id
     left join accounts a on a.id = b.account_id
     left join accounts ta on ta.id = b.target_account_id
     where ${where.join(' and ')}
     order by b.occurred_at desc, b.created_at desc
     limit 200`,
    values
  );
  res.json({ bills: result.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  if (input.type !== 'transfer' && !input.accountId) throw new HttpError(400, '请选择账户');
  if (input.type === 'transfer' && (!input.accountId || !input.targetAccountId)) throw new HttpError(400, '请选择转出和转入账户');

  const bill = await transaction(async (client) => {
    const created = await client.query(
      `insert into bills (user_id, type, amount, category_id, account_id, target_account_id, occurred_at, remark)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [req.user.id, input.type, input.amount, input.categoryId || null, input.accountId || null, input.targetAccountId || null, input.occurredAt, input.remark]
    );
    await adjustBalances(client, req.user.id, created.rows[0], 1);
    return created.rows[0];
  });

  res.status(201).json({ bill });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const input = schema.partial().parse(req.body);
  const bill = await transaction(async (client) => {
    const existing = await client.query('select * from bills where id = $1 and user_id = $2', [req.params.id, req.user.id]);
    if (!existing.rowCount) throw new HttpError(404, '账单不存在');
    await adjustBalances(client, req.user.id, existing.rows[0], -1);
    const next = {
      ...existing.rows[0],
      type: input.type ?? existing.rows[0].type,
      amount: input.amount ?? existing.rows[0].amount,
      category_id: input.categoryId ?? existing.rows[0].category_id,
      account_id: input.accountId ?? existing.rows[0].account_id,
      target_account_id: input.targetAccountId ?? existing.rows[0].target_account_id,
      occurred_at: input.occurredAt ?? existing.rows[0].occurred_at,
      remark: input.remark ?? existing.rows[0].remark
    };
    const updated = await client.query(
      `update bills set type = $1, amount = $2, category_id = $3, account_id = $4,
       target_account_id = $5, occurred_at = $6, remark = $7, updated_at = now()
       where id = $8 and user_id = $9 returning *`,
      [next.type, next.amount, next.category_id, next.account_id, next.target_account_id, next.occurred_at, next.remark, req.params.id, req.user.id]
    );
    await adjustBalances(client, req.user.id, updated.rows[0], 1);
    return updated.rows[0];
  });
  res.json({ bill });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  await transaction(async (client) => {
    const existing = await client.query('delete from bills where id = $1 and user_id = $2 returning *', [req.params.id, req.user.id]);
    if (!existing.rowCount) throw new HttpError(404, '账单不存在');
    await adjustBalances(client, req.user.id, existing.rows[0], -1);
  });
  res.status(204).end();
}));

export default router;
