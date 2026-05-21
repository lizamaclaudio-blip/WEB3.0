-- PW3_AUTH_REGISTRATION_GUARDS_001.sql
-- Idempotente, no destructivo.
-- Crea guard de unicidad case-insensitive para email.

create unique index if not exists app_users_email_lower_unique
  on public.app_users (lower(email));
