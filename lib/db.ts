import { Pool, type QueryResultRow } from "pg";

// Single shared pool across route handlers / scripts within one process.
// Next.js dev-mode module reuse means we guard against creating multiple
// pools on hot reload via a global cache, same pattern used for Prisma.
declare global {
  // eslint-disable-next-line no-var
  var __bricsPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and set it."
    );
  }
  return new Pool({ connectionString });
}

export function getPool(): Pool {
  if (!global.__bricsPgPool) {
    global.__bricsPgPool = createPool();
  }
  return global.__bricsPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const pool = getPool();
  return pool.query<T>(text, params);
}
