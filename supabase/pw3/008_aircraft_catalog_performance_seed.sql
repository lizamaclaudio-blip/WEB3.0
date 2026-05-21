create table if not exists aircraft_families (
  id uuid primary key default gen_random_uuid(),
  family_code text unique not null,
  family_name text not null
);

create table if not exists aircraft_models (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references aircraft_families(id),
  model_code text unique not null,
  model_name text not null
);

create table if not exists aircraft_variants (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references aircraft_models(id),
  variant_code text unique not null,
  variant_name text not null
);

create table if not exists aircraft_performance_profiles (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null unique references aircraft_models(id),
  seats int not null,
  cargo_kg numeric not null,
  practical_range_nm numeric not null,
  cruise_speed_kt numeric not null,
  fuel_burn_kg_h numeric not null,
  reserve_factor numeric not null default 0.85,
  is_widebody boolean not null default false,
  is_cargo boolean not null default false,
  is_training boolean not null default false,
  is_commercial boolean not null default true
);

create table if not exists rank_aircraft_permissions (
  id uuid primary key default gen_random_uuid(),
  rank_code text not null references pilot_ranks(rank_code),
  model_code text not null references aircraft_models(model_code),
  unique(rank_code, model_code)
);

insert into aircraft_families (family_code, family_name)
values
('GA','General Aviation'),
('TURBOPROP','Turboprop'),
('REGIONAL_JET','Regional Jet'),
('AIRBUS_NB','Airbus Narrowbody'),
('AIRBUS_WB','Airbus Widebody'),
('BOEING_NB','Boeing Narrowbody'),
('BOEING_WB','Boeing Widebody'),
('CLASSIC_JET','Classic Jet')
on conflict (family_code) do nothing;

with m(family_code, model_code, model_name, seats, cargo_kg, practical_range_nm, cruise_speed_kt, fuel_burn_kg_h, is_widebody, is_cargo, is_training, is_commercial) as (
  values
  ('GA','C172','Cessna 172',4,120,640,122,36,false,false,true,false),
  ('GA','BE58','Beechcraft Baron 58',6,300,950,200,110,false,false,true,false),
  ('TURBOPROP','C208','Cessna 208 Caravan',12,1600,900,186,230,false,true,true,true),
  ('TURBOPROP','TBM9','Daher TBM 930/940',6,450,1500,300,220,false,false,true,true),
  ('TURBOPROP','B350','Beechcraft King Air 350',10,1300,1500,290,380,false,false,true,true),
  ('TURBOPROP','DHC6','De Havilland DHC-6 Twin Otter',19,1800,700,160,300,false,false,true,true),
  ('TURBOPROP','ATR72','ATR 72',72,7500,820,275,900,false,false,false,true),
  ('REGIONAL_JET','AT76','ATR 72-600',76,7800,850,275,920,false,false,false,true),
  ('REGIONAL_JET','E170','Embraer E170',76,8000,2100,447,1200,false,false,false,true),
  ('REGIONAL_JET','E175','Embraer E175',88,9000,2200,447,1300,false,false,false,true),
  ('REGIONAL_JET','E190','Embraer E190',100,11000,2400,470,1500,false,false,false,true),
  ('REGIONAL_JET','E195','Embraer E195',120,12000,2300,470,1650,false,false,false,true),
  ('REGIONAL_JET','SU95','Sukhoi Superjet 95',95,10000,1600,450,1700,false,false,false,true),
  ('AIRBUS_NB','A319','Airbus A319',140,14000,3700,447,2400,false,false,false,true),
  ('AIRBUS_NB','A320','Airbus A320',180,16000,3300,450,2500,false,false,false,true),
  ('AIRBUS_NB','A20N','Airbus A320neo',186,16000,3500,450,2350,false,false,false,true),
  ('AIRBUS_NB','A321','Airbus A321',220,19000,3200,450,2800,false,false,false,true),
  ('AIRBUS_NB','A21N','Airbus A321neo',220,20000,4000,450,2600,false,false,false,true),
  ('AIRBUS_WB','A339','Airbus A330-900neo',300,45000,7200,470,5600,true,false,false,true),
  ('AIRBUS_WB','A359','Airbus A350-900',325,50000,8100,488,5800,true,false,false,true),
  ('BOEING_NB','B736','Boeing 737-600',130,13000,3000,445,2400,false,false,false,true),
  ('BOEING_NB','B737','Boeing 737-700',149,15000,3300,449,2500,false,false,false,true),
  ('BOEING_NB','B738','Boeing 737-800',189,18000,3000,450,2600,false,false,false,true),
  ('BOEING_NB','B739','Boeing 737-900',215,19000,3200,450,2800,false,false,false,true),
  ('BOEING_NB','B38M','Boeing 737 MAX 8',189,19000,3500,453,2500,false,false,false,true),
  ('BOEING_WB','B748','Boeing 747-8F',0,137000,4300,490,9800,true,true,false,true),
  ('BOEING_WB','B772','Boeing 777-200ER',314,65000,7000,490,7000,true,false,false,true),
  ('BOEING_WB','B77F','Boeing 777F',0,102000,4900,488,7600,true,true,false,true),
  ('BOEING_WB','B77W','Boeing 777-300ER',396,70000,7300,490,7600,true,false,false,true),
  ('BOEING_WB','B789','Boeing 787-9',290,45000,7600,488,5400,true,false,false,true),
  ('BOEING_WB','B78X','Boeing 787-10',330,50000,6400,488,5900,true,false,false,true),
  ('CLASSIC_JET','MD82','McDonnell Douglas MD-82',155,14000,2000,440,3000,false,false,false,true),
  ('CLASSIC_JET','MD83','McDonnell Douglas MD-83',165,15000,2400,440,3200,false,false,false,true),
  ('CLASSIC_JET','MD88','McDonnell Douglas MD-88',149,14000,2200,440,3100,false,false,false,true)
)
insert into aircraft_models (family_id, model_code, model_name)
select af.id, m.model_code, m.model_name
from m join aircraft_families af on af.family_code = m.family_code
on conflict (model_code) do update set model_name = excluded.model_name;

insert into aircraft_performance_profiles (
  model_id, seats, cargo_kg, practical_range_nm, cruise_speed_kt, fuel_burn_kg_h,
  reserve_factor, is_widebody, is_cargo, is_training, is_commercial
)
select
  am.id, m.seats, m.cargo_kg, m.practical_range_nm, m.cruise_speed_kt, m.fuel_burn_kg_h,
  0.85, m.is_widebody, m.is_cargo, m.is_training, m.is_commercial
from (
  values
  ('C172',4,120,640,122,36,false,false,true,false),
  ('BE58',6,300,950,200,110,false,false,true,false),
  ('C208',12,1600,900,186,230,false,true,true,true),
  ('TBM9',6,450,1500,300,220,false,false,true,true),
  ('B350',10,1300,1500,290,380,false,false,true,true),
  ('DHC6',19,1800,700,160,300,false,false,true,true),
  ('ATR72',72,7500,820,275,900,false,false,false,true),
  ('AT76',76,7800,850,275,920,false,false,false,true),
  ('E170',76,8000,2100,447,1200,false,false,false,true),
  ('E175',88,9000,2200,447,1300,false,false,false,true),
  ('E190',100,11000,2400,470,1500,false,false,false,true),
  ('E195',120,12000,2300,470,1650,false,false,false,true),
  ('SU95',95,10000,1600,450,1700,false,false,false,true),
  ('A319',140,14000,3700,447,2400,false,false,false,true),
  ('A320',180,16000,3300,450,2500,false,false,false,true),
  ('A20N',186,16000,3500,450,2350,false,false,false,true),
  ('A321',220,19000,3200,450,2800,false,false,false,true),
  ('A21N',220,20000,4000,450,2600,false,false,false,true),
  ('A339',300,45000,7200,470,5600,true,false,false,true),
  ('A359',325,50000,8100,488,5800,true,false,false,true),
  ('B736',130,13000,3000,445,2400,false,false,false,true),
  ('B737',149,15000,3300,449,2500,false,false,false,true),
  ('B738',189,18000,3000,450,2600,false,false,false,true),
  ('B739',215,19000,3200,450,2800,false,false,false,true),
  ('B38M',189,19000,3500,453,2500,false,false,false,true),
  ('B748',0,137000,4300,490,9800,true,true,false,true),
  ('B772',314,65000,7000,490,7000,true,false,false,true),
  ('B77F',0,102000,4900,488,7600,true,true,false,true),
  ('B77W',396,70000,7300,490,7600,true,false,false,true),
  ('B789',290,45000,7600,488,5400,true,false,false,true),
  ('B78X',330,50000,6400,488,5900,true,false,false,true),
  ('MD82',155,14000,2000,440,3000,false,false,false,true),
  ('MD83',165,15000,2400,440,3200,false,false,false,true),
  ('MD88',149,14000,2200,440,3100,false,false,false,true)
) m(model_code,seats,cargo_kg,practical_range_nm,cruise_speed_kt,fuel_burn_kg_h,is_widebody,is_cargo,is_training,is_commercial)
join aircraft_models am on am.model_code = m.model_code
on conflict (model_id) do update set
  seats = excluded.seats,
  cargo_kg = excluded.cargo_kg,
  practical_range_nm = excluded.practical_range_nm,
  cruise_speed_kt = excluded.cruise_speed_kt,
  fuel_burn_kg_h = excluded.fuel_burn_kg_h;

insert into rank_aircraft_permissions (rank_code, model_code)
select x.rank_code, x.model_code
from (
  values
  ('CADET','C172'),('CADET','BE58'),
  ('SECOND_OFFICER','BE58'),('SECOND_OFFICER','C208'),('SECOND_OFFICER','B350'),('SECOND_OFFICER','TBM9'),
  ('FIRST_OFFICER','C208'),('FIRST_OFFICER','B350'),('FIRST_OFFICER','TBM9'),('FIRST_OFFICER','DHC6'),('FIRST_OFFICER','ATR72'),('FIRST_OFFICER','AT76'),('FIRST_OFFICER','E170'),('FIRST_OFFICER','E175'),
  ('SENIOR_FIRST_OFFICER','ATR72'),('SENIOR_FIRST_OFFICER','AT76'),('SENIOR_FIRST_OFFICER','E175'),('SENIOR_FIRST_OFFICER','E190'),('SENIOR_FIRST_OFFICER','E195'),('SENIOR_FIRST_OFFICER','A319'),('SENIOR_FIRST_OFFICER','B736'),('SENIOR_FIRST_OFFICER','B737'),
  ('CAPTAIN','A319'),('CAPTAIN','A320'),('CAPTAIN','A20N'),('CAPTAIN','A321'),('CAPTAIN','A21N'),('CAPTAIN','B737'),('CAPTAIN','B738'),('CAPTAIN','B739'),('CAPTAIN','B38M'),('CAPTAIN','E190'),('CAPTAIN','E195'),
  ('SENIOR_CAPTAIN','A320'),('SENIOR_CAPTAIN','A20N'),('SENIOR_CAPTAIN','A321'),('SENIOR_CAPTAIN','A21N'),('SENIOR_CAPTAIN','B737'),('SENIOR_CAPTAIN','B738'),('SENIOR_CAPTAIN','B739'),('SENIOR_CAPTAIN','B38M'),('SENIOR_CAPTAIN','A339'),('SENIOR_CAPTAIN','B789'),('SENIOR_CAPTAIN','B78X'),
  ('TRAINING_CAPTAIN','A320'),('TRAINING_CAPTAIN','A20N'),('TRAINING_CAPTAIN','A321'),('TRAINING_CAPTAIN','A21N'),('TRAINING_CAPTAIN','B738'),('TRAINING_CAPTAIN','E190'),
  ('COMMANDER','A339'),('COMMANDER','A359'),('COMMANDER','B772'),('COMMANDER','B77W'),('COMMANDER','B789'),('COMMANDER','B78X'),('COMMANDER','B77F'),('COMMANDER','B748')
) x(rank_code, model_code)
on conflict do nothing;
