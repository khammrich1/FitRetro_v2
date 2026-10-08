import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { repairReading } from "../src/features/daily-reading/repair.mjs";

const [replacementFile, mode] = process.argv.slice(2);
if (!replacementFile || (mode && mode !== "--apply"))
  throw new Error("Usage: node scripts/repair-daily-reading.mjs replacement.json [--apply]");
const replacement = JSON.parse(await readFile(replacementFile, "utf8"));
const connection = process.env.DATABASE_URL;
if (!connection)
  throw new Error("DATABASE_URL must already be set; do not paste it into logs or chat.");
const sql = postgres(connection, { max: 1 });
try {
  const result = await repairReading(sql, replacement, {
    apply: mode === "--apply",
    backup: async () => {
      const dir = resolve("backups");
      await mkdir(dir, { recursive: true, mode: 0o700 });
      const path = resolve(dir, `before-reader-repair-${Date.now()}-${randomUUID()}.dump`);
      // PGDATABASE accepts a URI without exposing credentials in process arguments.
      const dump = spawnSync("pg_dump", ["--format=custom", "--file", path], {
        env: { ...process.env, PGDATABASE: connection },
        stdio: ["ignore", "ignore", "pipe"],
      });
      if (dump.error || dump.status !== 0)
        throw new Error(
          "pg_dump backup failed. No repair was attempted; inspect local backup/tool configuration.",
        );
      return path;
    },
  });
  console.log(JSON.stringify(result));
} catch {
  // Do not echo driver errors, credentials, or article contents.
  console.error(
    "Reader repair aborted. No unverified update was committed. Check the target, reviewed replacement, backup tooling, and database connection locally.",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
