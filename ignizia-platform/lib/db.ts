// Temporary no-op DB layer.
// We are disabling SQLite/sql.js for now and will
// replace this with Supabase later.
//
// All exported functions keep the same signatures as before
// but they either return empty data or do nothing so that
// API routes can keep calling them without throwing.

export interface Database {
  run(sql: string, params?: any[]): void;
  exec(
    sql: string,
    params?: any[]
  ): Array<{
    columns: string[];
    values: any[][];
  }>;
}

let db: Database | null = null;

function createNoopDb(): Database {
  return {
    run: () => {
      // intentionally no-op
    },
    exec: () => {
      // always return empty result set
      return [];
    },
  };
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = createNoopDb();
  }
  return db;
}

export function saveDb() {
  // no-op while SQLite is disabled
}

// Helper to ensure user exists
export async function ensureUser(userId: string): Promise<void> {
  // no-op placeholder
  void userId;
}

// Update user's last analyzed comment
export async function updateUserLastAnalyzedComment(userId: string, commentId: string): Promise<void> {
  // no-op placeholder
  void userId;
  void commentId;
}

// Get user's last analyzed comment
export async function getUserLastAnalyzedCommentId(userId: string): Promise<string | null> {
  // no-op placeholder – always "no data yet"
  void userId;
  return null;
}

// Generic query helpers
export function queryAll<T>(database: Database, sql: string, params: any[] = []): T[] {
  const result = database.exec(sql, params);
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export function queryOne<T>(database: Database, sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(database, sql, params);
  return results.length > 0 ? results[0] : null;
}
