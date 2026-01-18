import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

// Type definitions for Turso client
export type DbClient = ReturnType<typeof createClient> | Database.Database;

let dbClient: DbClient | null = null;
let isTurso = false;

export function getDb(): DbClient {
  if (!dbClient) {
    // Use Turso in production (when env vars are set), SQLite locally
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      isTurso = true;
      dbClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      console.log('Connected to Turso database');
    } else {
      isTurso = false;
      const dbPath = join(process.cwd(), 'recipes.db');
      dbClient = new Database(dbPath);
      console.log('Connected to local SQLite database');

      // Initialize schema for local SQLite
      const schema = readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf-8');
      (dbClient as Database.Database).exec(schema);
    }
  }
  return dbClient;
}

export function isTursoDb(): boolean {
  getDb(); // Ensure db is initialized
  return isTurso;
}

// Helper function to execute queries that works with both Turso and SQLite
export async function executeQuery(
  sql: string,
  params?: any
): Promise<any> {
  const db = getDb();

  if (isTurso) {
    // Turso uses async methods
    const tursoDb = db as ReturnType<typeof createClient>;
    const result = await tursoDb.execute({
      sql,
      args: params || [],
    });
    return result;
  } else {
    // SQLite uses sync methods
    const sqliteDb = db as Database.Database;
    const stmt = sqliteDb.prepare(sql);

    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return { rows: stmt.all(params || {}) };
    } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const info = stmt.run(params || {});
      return { lastInsertRowid: info.lastInsertRowid, rowsAffected: info.changes };
    } else {
      const info = stmt.run(params || {});
      return { rowsAffected: info.changes };
    }
  }
}
