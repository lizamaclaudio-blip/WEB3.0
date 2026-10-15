# WEB 4.5 — private server retry runner, prepared and disabled

## Actual delivery state

The executable alternative is `scripts/web45-mail-runner.mjs`, using Node 24
built-ins only. It is **not installed, scheduled, enabled, or connected to real
credentials**. No new service, timer, Vercel environment variable, DNS record,
database object, or mail has been created by this implementation. `pg_net`
remains removed and the existing Supabase scheduler remains disabled.

Importing the module has no side effects. Running it without an exact
`VECTOR_MAIL_RUNNER_ENABLED=true` returns `DISABLED` before filesystem or network
access. The CLI accepts no arguments; secrets must never be supplied on its
command line. The unit tests use synthetic credentials, clocks, memory files and
mock HTTP, including the real file-store adapter; they send no mail.

This is a server execution mechanism prepared for a separately authorized host.
It does not claim that periodic retries are already operating in Preview.

## Request boundary and credentials

An enabled invocation makes **at most one** POST, with an empty JSON object, to
this literal target compiled into the runner:

`https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app/api/vector/mail/dispatch`

There is no caller-supplied URL, recipient, job ID, payload, SMTP configuration,
or bypass-protection option. HTTPS is fixed, redirects are rejected, cookies are
omitted, caching is disabled, and configuration with
`NODE_TLS_REJECT_UNAUTHORIZED=0` is rejected before filesystem or HTTP access;
Node's certificate verification must stay enabled. An abort signal limits the HTTP request to
55 seconds, including reading the acknowledgement. No immediate HTTP retry is
performed. HTTP 200 must carry JSON with `ok=true`, `enabled=true` and the
worker's exact aggregate fields: integer counts from zero to four whose outcome
sum equals the claimed count. The response is streamed with a 2 KiB limit;
HTML/login pages, invalid content types, oversized bodies and malformed or
inconsistent JSON return `WORKER_RESPONSE_INVALID`. Only Content-Type and
Content-Length are inspected; raw bodies and headers are never logged, persisted
or forwarded. `DISPATCH_ACKNOWLEDGED` proves that bounded worker acknowledgement,
not inbox receipt, SMTP authentication, DKIM alignment or successful delivery of
every job.

Trusted host environment variables, never source files or CLI arguments:

| Name | Purpose |
| --- | --- |
| `VECTOR_MAIL_RUNNER_ENABLED` | Absent/false by default; exact `true` is required. |
| `VECTOR_MAIL_RUNNER_STATE_DIR` | Existing absolute directory on a private Linux local filesystem. |
| `VECTOR_MAIL_WORKER_SECRET` | Existing endpoint bearer, supplied through the host's secure environment facility. |
| `VECTOR_MAIL_RUNNER_VERCEL_BYPASS` | Protection bypass for the current authenticated Preview; mandatory for this runner. |

The runner deliberately receives no Supabase key, SMTP password or mail-token
signing secret. Its worker bearer grants dispatch/SMTP-preflight access, not a
public per-recipient send API. The existing Preview recipient allowlist must
remain in force.

Vercel's Automation Bypass credential can access protected deployments across
the **project**, including deployments outside this fixed branch. Keeping the
HTTP target fixed reduces this runner's use of the credential; it does not
reduce the credential's inherent scope. Creating/provisioning that credential,
sharing the existing worker bearer with a new host and enabling execution all
require separate owner authorization. No credential was generated or copied.
Do not weaken Vercel protection or rotate existing secrets as a workaround.

## Persistence, concurrency and failure handling

The host must provide an owned directory with mode `0700`, on a persistent local
Linux filesystem with reliable exclusive creation, atomic rename and fsync. A
dedicated unprivileged account should be its sole user. The adapter rejects
other platforms, symlinked directory entries, wrong ownership, public/group
permissions, hardlinked state files and state larger than 1 KiB. Windows ACL
security and distributed/network-filesystem locking are not inferred from
POSIX mode bits. Do not run replicas against separate volumes.

`mail-runner.lock` uses exclusive no-follow creation and `0600` permissions. A
second process skips rather than overlaps. A crash lock is **never stolen** or
removed automatically, regardless of its age. The runner verifies the owned
lock's file identity before normal removal.

`mail-runner-state.json` contains only a schema version, invocation timestamp,
authentication latch and fixed result code. It contains no credentials, email
addresses, HTTP diagnostics or message bodies. Atomic `0600` pending-file writes
and file/directory fsync reserve a **120-second cooldown before HTTP**. The
cooldown survives a new process and applies after success, timeout and failure.
A clock moving backwards, malformed state or an orphan pending file stops work.
Persistence failure retains the lock, with no attempt to guess whether the HTTP
transaction completed. Authentication HTTP 401/403, including a late response
observed after timeout, permanently latches
`AUTH_BLOCKED`; subsequent invocations perform no HTTP until an operator reviews
the cause and safely repairs host state. No authentication retry loop is used.

The local file guard is execution coordination, **not a second mail queue**.
The existing Supabase outbox remains the authoritative durable queue and
idempotency boundary:

- Existing unique request/cycle keys, `FOR UPDATE SKIP LOCKED` leases and stable
  message IDs are reused. The runner cannot reopen or select individual jobs.
- The dispatcher claims one eligible job at a time, at most four per invocation,
  only when the existing 45-second execution budget has room.
- Existing five-attempt/23-hour limits and backoff remain unchanged. HTTP retries
  never reset those limits or replay the form transaction.
- `sent`, `failed`, `delivery_unknown` and `suppressed` stay final. Existing
  delivered confirmations and welcome messages are never regenerated.
- SMTP ambiguity is terminal rather than automatically resent. SMTP itself
  does not guarantee exactly-once delivery; an HTTP timeout proves neither
  delivery nor non-delivery.

## Future private-host service/timer, not installed

Native Vercel Cron remains unsuitable here: the verified Hobby plan has a daily
schedule and Vercel Cron targets production, while this work is Preview-only.
Do not add production cron configuration or upgrade a paid service to circumvent
that restriction. No scheduler in GitHub, Supabase, Vercel or another platform
has been activated.

For a future approved private Linux host, prepare a dedicated unprivileged
oneshot service and a separate two-minute timer. The timer must remain disabled
until the checks below are approved. Use the host's trusted secret-management
facility to inject the two values into the **process environment**; do not put
secret values in unit files, `EnvironmentFile`, shell commands, history, repo,
reports or logs. If the chosen host cannot supply that safely, do not activate
this design there.

Service configuration to prepare during that separate operation:

- Run Node 24 with `node /opt/vector-mail/scripts/web45-mail-runner.mjs`, no args;
  deploy the reviewed script read-only and provide only its private state volume.
- Start with `VECTOR_MAIL_RUNNER_ENABLED=false`; the timer is disabled too.
- Use a non-root service account, umask `0077`, no new privileges, strict system
  filesystem protection, private temporary storage and core dumps disabled.
- Allow writes only in `/var/lib/vector-mail-runner`; restrict outbound traffic
  to trusted DNS and HTTPS access needed for the fixed Vercel host.
- Set an outer runtime ceiling of 75 seconds; local filesystem I/O is not a
  network-backed operation. Forced termination intentionally leaves the lock
  for manual inspection.
- Allow no overlap, no service-level automatic restart, no catch-up/backfill
  bursts and no immediate retry. A future timer may request one run every two
  minutes; persistent cooldown is an independent safety check.
- Logs contain the script's fixed JSON code only. Alert on `AUTH_BLOCKED`,
  persistence/lock errors and repeated endpoint failures; never enable shell
  tracing or environment dumps. Keep host process access restricted.

The per-run ceiling is one HTTPS request and the dispatcher's existing four-job
cap. A two-minute timer could request up to 720 runs/day; this is a scheduling
ceiling, **not approval to send 2,880 messages/day or a broadcast feature**.
Actual outbox, consent, attempt-budget and Preview allowlist rules still govern
every job. Host costs/capacity and any daily operational limit must be agreed
before enabling the timer; no paid resource is provisioned by this work.

## Required authorization and activation checklist

1. The owner chooses and approves a private Linux host, costs if any, secure
   environment injection, its administrative users and persistent directory.
2. Obtain explicit approval for the project-scoped Vercel bypass credential and
   for securely provisioning the existing worker bearer. Never paste values in
   chat. No rotation is implicit in that approval.
3. Verify the reviewed branch is deployed at the fixed Preview alias. Preserve
   the web-only branch, Preview mail allowlist, existing RLS and disabled
   Supabase scheduler; do not reinstall `pg_net`.
4. Run host storage/concurrency checks with synthetic data and no credentials.
   Inspect aggregate outbox counts and terminal states before any authorized
   real invocation. Resolve unexpected backlog explicitly; never backfill mail.
5. Complete separately authorized SMTP/DKIM work if required; this runner does
   not rotate credentials or change DNS. A real send or inbox validation is a
   separate owner-approved test, restricted to the owner's address.
6. Enable a single bounded run only after authorization; verify sanitized HTTP
   outcome plus outbox state. Enable the two-minute timer only after approving
   that ongoing execution. Keep an immediate disable path and alerting ready.

For manual recovery, stop/disable the timer and running service first. Confirm
no process/request is still active, review the fixed host state and authoritative
outbox, and repair permissions/credentials only with authorization. Preserve the
last-attempt cooldown; do not blindly delete locks, pending files, authentication
latches or terminal queue entries. Resuming must never reset mail attempt
counters, resend delivered welcome messages or infer delivery from an HTTP
failure. Recovery is intentionally not a CLI feature.

## Automated verification

`node --test tests/web4/mail-runner.test.mjs` covers disabled/import safety,
configuration, credential redaction, fixed target/POST/redirect policy, bounded
worker acknowledgement (including HTML, malformed and oversized bodies),
exclusive overlap protection, durable cooldown, authentication latching,
HTTP/network faults without immediate retry, abort/late response handling,
malformed state and clock rollback, pre/post-request disk failure, safe CLI
output, Linux ownership/permissions/no-follow checks, atomic fsynced persistence,
hardlink/symlink rejection and orphan/crash-lock behavior. All HTTP and files are
synthetic fixtures. Actual external host execution remains unverified and off.
