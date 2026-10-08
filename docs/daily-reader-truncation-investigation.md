# Daily Reader completion fix and targeted repair (#49)

## Prevention

Generation accepts only an API `end_turn` response, valid structured output, a nonempty title,
and a 600–1800-word body with a finished sentence ending (not an ellipsis). The requested length
remains 800–1200 words; the wider validation range allows reasonable model variation. These are
structural guards, not a guarantee of semantic completeness.

The output ceiling is 6000 tokens: 1200 words at a conservative four tokens per word plus JSON
and escaping headroom. This removes the unnecessarily tight 3000-token ceiling without asserting
that token exhaustion caused the reported incident. Safe completion metadata is logged before
parsing, without article content, prompts, or credentials.

An incomplete generation retries once in the same single-flight lease. SDK automatic retries are
disabled, so there are no hidden extra attempts. The existing atomic rate-limit store caps attempts
for each day/topic at two per rolling 24 hours, including failures. Lease expiry and page reloads
cannot bypass this budget. Provider credit/auth/network errors do not retry automatically. Existing
cached articles are never overwritten by background generation. Subscribers see a clear unavailable
state when the current day's article is absent; Check again refreshes the page and obeys the same
lease and persistent budget. No new schema migration.

## Incident evidence still needed

The affected saved row and original API response are unavailable in this workspace. The owner
reported a leadership article ending “Vague feedback like”. Source confirms there was no completion
check before caching. Token exhaustion remains a hypothesis, not the confirmed incident cause.

Inspect the affected environment read-only (do not share DATABASE_URL):

```sql
BEGIN READ ONLY;
SELECT id, day, topic, title, length(body) AS characters,
       right(body, 240) AS ending, read_minutes
FROM daily_readings
WHERE topic = 'leadership'
  AND day BETWEEN '2026-10-01' AND '2026-10-07'
  AND rtrim(body) LIKE '%Vague feedback like';
ROLLBACK;
```

## Backup-first targeted repair

The PR includes `scripts/repair-daily-reading.mjs`. It makes no AI requests. Prepare a reviewed
replacement JSON file locally with `id`, `day`, `topic: "leadership"`, `title`, and a complete `body`.
Use the exact ID/day returned by the inspection. Keep replacement files out of Git.

With DATABASE_URL already set on **dev**, run:

```bash
node scripts/repair-daily-reading.mjs /secure/path/replacement.json
node scripts/repair-daily-reading.mjs /secure/path/replacement.json --apply
```

The first command is a read-only dry run. The apply command validates the replacement using the same
completion guard as generation, verifies the exact saved row still ends with the reported phrase,
and automatically runs a full `pg_dump` custom-format backup **before any update**. Backup failure
aborts the repair. Backups are retained under `backups/` (Git-ignored); protect them as sensitive data.

The update runs transactionally and matches ID, day, topic, and the full old body. If another process
changed the article after inspection, the update rolls back. It updates only title/body/read_minutes;
it does not delete a cache, regenerate unrelated articles, or change IDs/dates. Applying twice fails
the reported-ending check. No repair has been executed from this workspace.

After repair, verify the finished ending and identical text after refresh on d.fitretro.app. Test a
new generation and simulated failure there before production. Keep PR #55 in draft until checks and
owner acceptance are complete. A production repair requires its own environment inspection and
backup; do not treat dev verification as production verification.
