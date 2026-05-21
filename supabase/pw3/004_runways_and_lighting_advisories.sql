update airports set lighting_policy = 'UNKNOWN_ADVISORY', lighting_warning_only = true;

with runway_state as (
  select
    a.id as airport_id,
    bool_or(coalesce(ar.lighted, false) = true and coalesce(ar.closed, false) = false) as has_lighted_open,
    bool_or(coalesce(ar.lighted, false) = false and coalesce(ar.closed, false) = false) as has_unlighted_open
  from airports a
  left join airport_runways ar on ar.airport_id = a.id
  group by a.id
)
update airports a
set lighting_policy = case
  when rs.has_lighted_open then 'DAY_NIGHT_CONFIRMED'
  when rs.has_unlighted_open then 'DAY_ONLY_ADVISORY'
  else 'UNKNOWN_ADVISORY'
end,
lighting_warning_only = true,
updated_at = now()
from runway_state rs
where rs.airport_id = a.id;
