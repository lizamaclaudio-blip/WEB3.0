create table if not exists pilot_ranks (
  id uuid primary key default gen_random_uuid(),
  rank_code text unique not null,
  display_name text not null,
  rank_order int not null,
  required_hours_in_rank numeric not null default 0,
  required_flights_in_rank int not null default 0,
  allows_training boolean not null default false,
  allows_ferry boolean not null default true,
  allows_positioning boolean not null default true,
  allows_passenger boolean not null default false,
  allows_cargo boolean not null default false,
  allows_charter boolean not null default false,
  allows_international boolean not null default false,
  allows_oceanic boolean not null default false,
  allows_long_range boolean not null default false,
  allows_widebody boolean not null default false,
  allows_instructor boolean not null default false,
  allows_admin boolean not null default false
);

insert into pilot_ranks (
  rank_code, display_name, rank_order, required_hours_in_rank, required_flights_in_rank,
  allows_training, allows_ferry, allows_positioning, allows_passenger, allows_cargo,
  allows_charter, allows_international, allows_oceanic, allows_long_range,
  allows_widebody, allows_instructor, allows_admin
)
values
('CADET','Cadet',1,10,8,true,true,true,false,false,false,false,false,false,false,false,false),
('SECOND_OFFICER','Second Officer',2,20,10,true,true,true,false,false,true,false,false,false,false,false,false),
('FIRST_OFFICER','First Officer',3,40,15,true,true,true,true,true,true,false,false,false,false,false,false),
('SENIOR_FIRST_OFFICER','Senior First Officer',4,75,20,true,true,true,true,true,true,false,false,false,false,false,false),
('CAPTAIN','Captain',5,150,30,true,true,true,true,true,true,true,true,true,false,false,false),
('SENIOR_CAPTAIN','Senior Captain',6,200,35,true,true,true,true,true,true,true,true,true,true,false,false),
('TRAINING_CAPTAIN','Training Captain',7,250,40,true,true,true,true,true,true,true,true,true,true,true,false),
('COMMANDER','Commander',8,300,45,true,true,true,true,true,true,true,true,true,true,true,false),
('SENIOR_COMMANDER','Senior Commander',9,500,60,true,true,true,true,true,true,true,true,true,true,true,false),
('CHIEF_PILOT','Chief Pilot',10,500,60,true,true,true,true,true,true,true,true,true,true,true,true)
on conflict (rank_code) do update set
  display_name = excluded.display_name,
  rank_order = excluded.rank_order,
  required_hours_in_rank = excluded.required_hours_in_rank,
  required_flights_in_rank = excluded.required_flights_in_rank,
  allows_training = excluded.allows_training,
  allows_passenger = excluded.allows_passenger,
  allows_cargo = excluded.allows_cargo,
  allows_charter = excluded.allows_charter,
  allows_international = excluded.allows_international,
  allows_oceanic = excluded.allows_oceanic,
  allows_long_range = excluded.allows_long_range,
  allows_widebody = excluded.allows_widebody,
  allows_instructor = excluded.allows_instructor,
  allows_admin = excluded.allows_admin;
