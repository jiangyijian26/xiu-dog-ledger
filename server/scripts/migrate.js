import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../src/db.js';

const sqlPath = resolve(process.cwd(), '..', 'database', '001_init.sql');
const sql = await readFile(sqlPath, 'utf8');

try {
  await pool.query(sql);
  console.log('Database migration completed');
} finally {
  await pool.end();
}
