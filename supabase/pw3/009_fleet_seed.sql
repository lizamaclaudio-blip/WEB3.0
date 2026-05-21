create table if not exists fleet_aircraft (
  id uuid primary key default gen_random_uuid(),
  registration text unique not null,
  model_code text not null references aircraft_models(model_code),
  current_airport_id uuid references airports(id),
  base_airport_id uuid references airports(id),
  aircraft_status text not null default 'AVAILABLE',
  created_at timestamptz not null default now()
);

with fleet(registration, model_code, hub_ident) as (
  values
  ('CC-PCA','C172','SCPF'),('CC-PCB','C172','SCPF'),('CC-PCC','C172','SCPF'),('CC-PBA','BE58','SCPF'),
  ('CC-PCD','C172','SCTB'),('CC-PCE','C172','SCTB'),('CC-PCF','C172','SCTB'),('CC-PBB','BE58','SCTB'),
  ('CC-PCG','C172','SCIE'),('CC-PCH','C172','SCIE'),('CC-PBC','BE58','SCIE'),
  ('CC-PGA','C208','SCTE'),('CC-PGB','C208','SCTE'),('CC-PKA','B350','SCTE'),('CC-PMA','TBM9','SCTE'),
  ('CC-PTA','ATR72','SCTE'),('CC-PEA','E175','SCTE'),('CC-PAA','A20N','SCTE'),('CC-PJA','B738','SCTE'),
  ('CC-PGC','C208','SCEL'),('CC-PKB','B350','SCEL'),('CC-PTB','ATR72','SCEL'),('CC-PEB','E190','SCEL'),
  ('CC-PAB','A20N','SCEL'),('CC-PAC','A320','SCEL'),('CC-PAD','A21N','SCEL'),('CC-PJB','B738','SCEL'),
  ('CC-PJC','B38M','SCEL'),('CC-PDA','B789','SCEL'),('CC-PFA','B77F','SCEL'),
  ('CC-PGD','C208','SCIE'),('CC-PTC','ATR72','SCIE'),('CC-PEC','E175','SCIE'),
  ('CC-PGE','C208','SCCI'),('CC-PKC','B350','SCCI'),('CC-PTD','ATR72','SCCI'),('CC-PED','E175','SCCI'),
  ('CC-PGF','C208','SCFA'),('CC-PKD','B350','SCFA'),('CC-PTE','ATR72','SCFA'),('CC-PAE','A20N','SCFA'),
  ('CC-PGG','C208','SCDA'),('CC-PKE','B350','SCDA'),('CC-PTF','ATR72','SCDA'),
  ('CC-PGH','C208','SCBA'),('CC-PBD','BE58','SCBA'),('CC-PKF','B350','SCBA')
)
insert into fleet_aircraft (registration, model_code, current_airport_id, base_airport_id, aircraft_status)
select f.registration, f.model_code, a.id, a.id, 'AVAILABLE'
from fleet f
join airports a on a.ident = f.hub_ident
on conflict (registration) do update set
  model_code = excluded.model_code,
  current_airport_id = excluded.current_airport_id,
  base_airport_id = excluded.base_airport_id,
  aircraft_status = excluded.aircraft_status;
