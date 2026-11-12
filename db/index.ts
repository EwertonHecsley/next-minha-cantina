import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://cantina_user:cantina_pass@localhost:5432/cantina_db';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
