# Daily Reader truncation investigation (#49)

## Confirmed so far

At main 385c384, generation requests 800–1200 words with max_tokens=3000.
The cache stores title/body/readMinutes; it does not store the original API stop reason or usage.
The installed SDK’s lib/parser.mjs parses JSON without checking stop_reason, and may throw before
returning completion metadata. App generation accepts any successfully parsed title/body.
There is no application-side body slicing between generation and persistence.

The owner reported an article ending “Vague feedback like”. The affected stored row and original
API response have not been inspected from this workspace: there is no DATABASE_URL, API key, or
server-log access. Token exhaustion is a hypothesis, not a confirmed incident cause.

## Read-only cache inspection (run on the affected environment)

Use the existing database connection without copying credentials into chat. Start a read-only
transaction. This query only returns leadership articles matching the reported ending; widen the
date range only if there is no match. Preserve the resulting ID/day for any later targeted repair.

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

## Generation diagnostics

This PR records message ID, topic, model, stop reason, token counts, configured budget, and text
length before structured-output parsing. After parsing, it records body length, word count, and
whether the ending has sentence punctuation. It does not log article text, keys, prompts, or raw
provider errors. Use these events to distinguish token exhaustion, malformed JSON, and a model
response that completed but supplied an unfinished article. Message IDs and topic metadata should
remain in restricted operational logs under the existing retention policy.

No extra paid calls, retry changes, token budget changes, cache invalidation, or database writes
are added by this diagnostic change. Existing generation/cache behavior is retained. This is not
a fix for incomplete articles and does not close #49.

## Fix and targeted repair after evidence

Confirm the affected row and available generation metadata before selecting the completion guard,
content validation, and token budget. Add persistence tests proving incomplete responses cannot be
cached or replace a valid article, and preserve bounded single-flight retry/cost controls.

Before any targeted overwrite, take a backup:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d%H%M%S).sql
```

Then prepare a transaction selecting the confirmed row by ID/day/topic and matching the expected
old body, stage a validated replacement, and update only that exact row. Do not delete a whole
day/topic cache or regenerate unrelated readings. No repair SQL is supplied until the affected
row and replacement have been verified. Validate the repaired ending and a newly generated article
on d.fitretro.app before production.
