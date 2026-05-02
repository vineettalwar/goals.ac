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
