-- BLOCKED / NOT APPLIED. Intentionally fails before any activation or Vault read.
-- Hosted pg_net grants cannot enforce the owner-only HTTP queue assumed by WEB44.
-- See docs/WEB44-MAIL-SCHEDULER.md and the official platform limitation:
-- https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16
do $$
begin
  raise exception 'WEB44_SCHEDULER_ACTIVATION_BLOCKED: review a safe scheduler architecture before activation';
end;
$$;

-- Future checklist only; these comments are NOT an executable activation plan:
-- 1. Resolve the shared SQL HTTP queue credential exposure with a reviewed design.
-- 2. Obtain separate authorization for any Vercel Automation Bypass permission;
--    that token covers all project deployments, not only the development branch.
-- 3. Provision only the reviewed credentials through secure provider interfaces.
--    No credentials, Vault values, SMTP passwords or literal tokens belong here.
-- 4. Confirm Preview-only target, platform limits, least privilege and disabled gates.
-- 5. Add a new versioned implementation and access tests; do not bypass this hold.
-- 6. Validate one automatic cycle without third-party mail or historical resends.
