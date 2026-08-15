import { Client } from "pg";

/**
 * Executes a SQL string against a user-supplied Postgres connection,
 * but only if it is a single, read-only SELECT statement. This is a
 * defense-in-depth safeguard on top of the LLM prompt instructions —
 * never trust generated SQL blindly.
 */
export async function runReadOnlyQuery(dbUrl: string, sql: string) {
  const trimmed = sql.trim().replace(/;+\s*$/g, "");

  if (!/^select\s/i.test(trimmed)) {
    throw new Error("Only SELECT queries can be executed automatically.");
  }

  if (/;/.test(trimmed)) {
    throw new Error("Multiple statements are not allowed.");
  }

  const forbidden = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create)\b/i;
  if (forbidden.test(trimmed)) {
    throw new Error("Only read-only SELECT queries can be executed automatically.");
  }

  const client = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: 8000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    // Hard-cap execution time and row count for safety.
    await client.query("SET statement_timeout = 5000");
    const hasLimit = /\blimit\s+\d+/i.test(trimmed);
    const finalSql = hasLimit ? trimmed : `${trimmed} LIMIT 200`;
    const result = await client.query(finalSql);
    return result.rows;
  } finally {
    await client.end().catch(() => {});
  }
}
