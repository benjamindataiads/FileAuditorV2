
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  console.error('Please set up a database using the Database tool in Replit');
  process.exit(1);
}

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });
