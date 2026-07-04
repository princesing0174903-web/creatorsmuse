# Phase 4 — AI Production Pipeline

Upgrade the existing generation flow into a real job pipeline. No UI redesign, no navigation changes, no localStorage. All state lives in the database.

## What ships

1. **Generation jobs** with full lifecycle: `queued → processing → completed | failed | cancelled`.
2. **Retry** failed jobs and **cancel** in-flight jobs from the Dashboard history strip.
3. **Version history** — every regeneration keeps prior outputs linked via `parent_id` and surfaces a "vN" picker on results.
4. **Autosave drafts** — the Workbench topic/params persist per project to `user_preferences.drafts` on every keystroke (debounced), and restore on reload.
5. **Realtime progress** — the running job's status/progress streams via Supabase Realtime to the history strip.
6. **Audit + error recovery** — every state transition is timestamped; failures store the error, and the retry path re-enqueues cleanly.

## Data model changes

Extend the existing `generations` table (kind, input, output, parent_id already present) with pipeline fields:

- `status` enum widened via check: `queued | processing | complete | failed | cancelled` (currently `pending | complete | failed`).
- `progress` int 0–100, default 0.
- `queued_at`, `started_at`, `finished_at`, `cancelled_at` timestamptz nullable.
- `attempt` int default 1, `max_attempts` int default 3.
- `error_code` text nullable (separate from human `error`).
- `version` int default 1 — auto-set to `parent.version + 1` on retry/regenerate.
- `cancel_requested` bool default false — cooperative cancel flag the runner polls.

Add a small `generation_events` table for the audit trail:

```
generation_events(id, generation_id fk, user_id fk, event, detail jsonb, created_at)
```
Events: `queued`, `started`, `progress`, `completed`, `failed`, `cancel_requested`, `cancelled`, `retried`. RLS: owner-scoped via `generation_id`.

Add `user_preferences.drafts jsonb` (map of `projectId → draft`) for autosave. No new table needed.

Enable Realtime on `generations` and `generation_events`.

Grants: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role`. Owner-only RLS (`auth.uid() = user_id`).

## Server functions (all `requireSupabaseAuth`)

New file `src/lib/jobs.functions.ts`:

- `enqueueGeneration({ kind, input, projectId, parentId? })` → creates a `queued` job, logs `queued` event, kicks off processing, returns the job id immediately.
- `getJob(id)` → row + last N events (for detail view; also used to hydrate reload).
- `listRecentJobs({ limit })` → replaces `listMyGenerations` for the history strip; includes status/progress/version.
- `retryJob(id)` → clones the failed/cancelled job as a new `queued` row with `parent_id = original`, `version = original.version + 1`, `attempt = 1`; logs `retried` event.
- `cancelJob(id)` → sets `cancel_requested = true`; if still `queued`, transitions straight to `cancelled`.
- `saveDraft({ projectId, draft })` / `getDrafts()` → upsert into `user_preferences.drafts`.

Refactor `src/lib/generate.functions.ts`:

- Split the existing `generateAssets` into `enqueueGeneration` (public, returns immediately) + `runGenerationJob(jobId)` (internal, does the AI call, updates progress, writes fan-out `library_assets`, transitions to `complete`/`failed`).
- `runGenerationJob` is invoked in-process via `ctx.waitUntil`-style fire-and-forget (`void runGenerationJob(id).catch(...)`) on Cloudflare Workers — good enough for the current single-shot AI calls and avoids introducing a queue system. Progress is reported at 3 checkpoints: `10` (started), `60` (AI responded), `100` (fan-out complete). Between checkpoints it polls `cancel_requested`; if set, it transitions to `cancelled` and writes no library rows.
- Failures write `status='failed'`, `error`, `error_code`, and log `failed` event. Retry path handles the rest.

## Client changes

`src/routes/dashboard.tsx` — targeted upgrades, no visual redesign:

- Replace the direct `generateAssets` call with `enqueueGeneration` + optimistic history entry.
- Subscribe (per-mounted user) to Supabase Realtime on `generations` filtered by `user_id`; on `UPDATE`, patch React Query cache for `["jobs"]` and, if the job just completed, invalidate `["library"]`.
- History strip gains three inline controls on hover for each row: **Cancel** (visible while `queued|processing`), **Retry** (visible while `failed|cancelled`), **vN** badge when `version > 1` with a menu to load older versions of the same lineage (`parent_id` chain).
- Show a slim progress bar (existing skeleton lane, no new component) on the currently running job driven by `progress`.
- Autosave: debounce topic/mode/tone into `saveDraft({ projectId })` at 600ms; on mount, hydrate from `getDrafts()` for the selected project.
- Error toasts read `error` from the job row; a failed job stays in the strip with a Retry button — no data loss.

`src/lib/plan.ts` — usage refresh already runs after generation; wire it into the Realtime `completed` handler instead of the imperative call site.

## Non-goals for this phase

- No queue service (BullMQ / Cloudflare Queues). In-process background with cooperative cancel is enough for current AI latencies (<60s). Contract is designed so a real queue can be swapped in later without touching the client.
- No new pages or nav.
- No changes to Reels Studio (its own pipeline, out of scope).
- No brand memory / publishing / analytics (Phases 8–12).

## Technical notes

- The runner writes progress with `supabaseAdmin` (RLS bypass, service role) because it runs outside the request auth context after fire-and-forget; the enqueue call itself uses the user's RLS-scoped client.
- Cancel is **cooperative** — the AI SDK call is wrapped with an `AbortController` fed by a 1s poll of `cancel_requested`. Once the AI call returns or aborts, the runner exits cleanly.
- Version lineage is stored purely via `parent_id` + `version`; no separate versions table.
- Draft autosave is keyed per project, so switching projects restores that project's last input.
- Realtime filter is `user_id=eq.<uid>` so users only see their own job stream. RLS enforces this server-side too.

## Files touched

- migration: extend `generations`, add `generation_events`, add `user_preferences.drafts`, enable Realtime.
- new: `src/lib/jobs.functions.ts`.
- edited: `src/lib/generate.functions.ts` (split enqueue + runner).
- edited: `src/routes/dashboard.tsx` (enqueue flow, realtime, retry/cancel/version controls, autosave).
- edited: `src/lib/workbench.functions.ts` (list swap → jobs list).
- edited: `src/integrations/supabase/types.ts` (auto-regenerated after migration).

## Verification

- Enqueue → row appears `queued`, transitions `processing → complete`; progress bar animates via Realtime.
- Cancel mid-run → job ends `cancelled`, no library rows written, usage credit NOT consumed on cancel.
- Failing prompt → job `failed` with error; Retry creates a new job with `version = 2`, prior output still visible via version menu.
- Reload mid-run → dashboard restores from DB, still shows `processing`.
- Autosave: type topic, reload → topic restored per project.
- RLS: second user cannot see or cancel first user's jobs.
