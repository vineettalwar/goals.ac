# Contributing

## Database Migrations

**Always use `drizzle-kit generate` — never write migrations by hand.**

Drizzle-kit keeps a snapshot of the schema after every migration in
`lib/db/migrations/meta/<N>_snapshot.json`. These snapshots are how drizzle-kit
figures out what has *already* been applied, so it only generates the *diff*
for new changes. If you write a `.sql` file by hand and skip the generate step,
the snapshot chain breaks: the next `generate` run will re-detect the manually
applied changes and include them in the new migration file, making it easy to
accidentally double-apply DDL statements.

### Correct workflow

1. Edit the Drizzle schema in `lib/db/src/schema/`.
2. Run the generator:
   ```sh
   pnpm --filter @workspace/db run generate
   ```
3. Review the generated `.sql` file in `lib/db/migrations/` and the matching
   snapshot in `lib/db/migrations/meta/`.
4. Commit **both** the `.sql` file and the snapshot file together.
5. Apply to the database:
   ```sh
   pnpm --filter @workspace/db run migrate
   ```

### If you must write SQL by hand

If you absolutely must write a migration file by hand (e.g. a data backfill or
a complex operation drizzle-kit cannot express), you **must** also run
`pnpm --filter @workspace/db run generate` immediately afterwards so that
drizzle-kit can produce the matching snapshot. Commit both the hand-written
`.sql` file and the generated snapshot together. Do **not** commit a hand-written
migration without its snapshot.

### Historical note — snapshot chain repair

Migrations 0012–0015, 0017, and 0018 were originally written by hand without
running `drizzle-kit generate`, so their snapshot files were missing from
`lib/db/migrations/meta/`. This broke the snapshot chain: drizzle-kit could not
tell what had already been applied and would have re-detected those changes on
the next `generate` run, risking double-application of DDL statements.

The chain was fully repaired by backfilling snapshots for 0012–0015, 0017, and
0018, and then generating migration 0019 to reconcile the diff. Running
`pnpm --filter @workspace/db run generate` against the current schema now
correctly reports **"No schema changes, nothing to migrate"**. Future `generate`
runs will produce only genuine diffs.
