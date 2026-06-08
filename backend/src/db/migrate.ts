import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../db/migrations");

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const applied = new Set(
  (await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations")).rows.map((row) => row.filename)
);

for (const filename of (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort()) {
  if (applied.has(filename)) continue;
  const sql = await readFile(path.join(migrationsDir, filename), "utf8");
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await pool.query("COMMIT");
    console.log(`Applied ${filename}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

await pool.end();
