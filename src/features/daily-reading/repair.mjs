import { isCompleteArticle } from "./validation.mjs";

/** Operator-only repair, dependency-injected so backup ordering and rollback can be tested. */
export async function repairReading(sql, replacement, { apply = false, backup }) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replacement.id ?? "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(replacement.day ?? "") ||
    replacement.topic !== "leadership" ||
    !isCompleteArticle(replacement.title, replacement.body)
  )
    throw new Error(
      "Replacement must identify one leadership row by ID/day and contain a reviewed complete article (600–1800 words).",
    );
  const rows = await sql.begin(
    "read only",
    (tx) =>
      tx`SELECT id, day::text, topic, body FROM daily_readings WHERE id=${replacement.id}::uuid AND day=${replacement.day}::date AND topic=${replacement.topic}`,
  );
  if (rows.length !== 1 || !rows[0].body.trimEnd().endsWith("Vague feedback like"))
    throw new Error(
      "Target does not uniquely match the reported incomplete ending. Nothing changed.",
    );
  const old = rows[0];
  if (!apply) return { id: old.id, day: old.day, topic: old.topic, applied: false };
  const backupPath = await backup(); // Must succeed before opening any write transaction.
  const minutes = Math.max(1, Math.round(replacement.body.trim().split(/\s+/).length / 200));
  await sql.begin(async (tx) => {
    const changed =
      await tx`UPDATE daily_readings SET title=${replacement.title}, body=${replacement.body}, read_minutes=${minutes} WHERE id=${old.id}::uuid AND day=${old.day}::date AND topic=${old.topic} AND body=${old.body} RETURNING id`;
    if (changed.length !== 1)
      throw new Error("Target changed after inspection; repair rolled back. Backup retained.");
  });
  return { id: old.id, day: old.day, topic: old.topic, applied: true, backup: backupPath };
}
