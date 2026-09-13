/**
 * Minimal, dependency-light migration runner: applies every .sql file in
 * /migrations, in filename order, that has not already been recorded in
 * the schema_migrations table. Run with `npm run migrate`.
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

const ROOT = path.resolve(__dirname, "..");
// Next.js convention: .env.local overrides .env for local dev secrets.
dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env.local (or export it) first."
    );
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const applied = new Set(
      (await client.query("SELECT filename FROM schema_migrations")).rows.map(
        (r) => r.filename
      )
    );

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log(`No .sql files found in ${MIGRATIONS_DIR}`);
      return;
    }

    let ranCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  (already applied): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`apply: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        ranCount += 1;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log(
      ranCount > 0
        ? `Done. Applied ${ranCount} migration(s).`
        : "Done. Nothing new to apply."
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
