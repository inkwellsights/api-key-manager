// Runs a .sql file against the database in DATABASE_URL (.env.local).
// Usage: node supabase/run-sql.mjs <path-to-sql-file>
import { config } from "dotenv";
import { readFileSync } from "fs";
import pg from "pg";

config({ path: ".env.local" });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("usage: node supabase/run-sql.mjs <file.sql>");
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(2);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  const v = await client.query("select version()");
  console.log("CONNECTED:", v.rows[0].version.split(" on ")[0]);
  const sql = readFileSync(sqlFile, "utf8");
  await client.query(sql);
  console.log("SQL EXECUTED OK:", sqlFile);
} catch (e) {
  console.error("DB ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
