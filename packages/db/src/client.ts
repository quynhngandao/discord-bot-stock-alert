import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { validateEnv } from '@discord-stock-alert-bot/config';
import * as schema from './schema.js';

validateEnv(process.env);
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
