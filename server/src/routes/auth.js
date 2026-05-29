import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncRoute, HttpError } from '../http.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { createUserDefaults } from '../services/defaults.js';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().trim().min(1).max(30).optional()
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    bio: user.bio
  };
}

router.post('/register', asyncRoute(async (req, res) => {
  const input = authSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await transaction(async (client) => {
    const existing = await client.query('select id from users where email = $1', [input.email]);
    if (existing.rowCount) {
      throw new HttpError(409, '邮箱已注册');
    }

    const created = await client.query(
      'insert into users (email, password_hash, nickname) values ($1, $2, $3) returning *',
      [input.email, passwordHash, input.nickname || '阿修用户']
    );
    await createUserDefaults(client, created.rows[0].id);
    return created.rows[0];
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const input = authSchema.pick({ email: true, password: true }).parse(req.body);
  const result = await query('select * from users where email = $1', [input.email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw new HttpError(401, '邮箱或密码错误');
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const result = await query('select * from users where id = $1', [req.user.id]);
  if (!result.rowCount) {
    throw new HttpError(404, '用户不存在');
  }
  res.json({ user: publicUser(result.rows[0]) });
}));

export default router;
