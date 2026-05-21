-- Aeropuertos
select count(*) as airports_total from airports;
select count(*) as closed_inactive_ok from airports where airport_type = 'closed' and is_active = false;
select ident, icao, is_active, airport_type from airports where ident in ('24OR','SCTE','SCEL','SCPF','SCTB','SCIE','SCIP','KJFK','LEMD');

-- Runways y luces
select count(*) as runways_total from airport_runways;
select lighting_policy, count(*) from airports group by lighting_policy order by 2 desc;

-- Búsqueda
select * from pw_search_airports_for_dispatch('SCTE', 10);
select * from pw_search_airports_for_dispatch('Santiago', 10);
select * from pw_search_airports_for_dispatch('Madrid', 10);

-- Distancias
select pw_airport_distance_nm('SCEL','SCIP') as scel_scip_nm;
select pw_airport_distance_nm('SCEL','LEMD') as scel_lemd_nm;
select pw_airport_distance_nm('SCTE','SCEL') as scte_scel_nm;

-- Hubs
select hub_code, is_school_hub, allows_initial_registration, allows_maintenance_major, is_accident_recovery_base, allows_international, allows_oceanic_national
from pw3_airline_hubs where hub_code in ('SCPF','SCTB','SCIE','SCTE','SCEL','SCIP');

-- Rangos
select count(*) as rank_count from pilot_ranks;

-- Catálogo
select model_code from aircraft_models where model_code in ('C172','BE58','C208','B350','TBM9','ATR72','E175','E190','A20N','A320','A21N','B738','B38M','B789','B77F') order by model_code;

-- Flota
select count(*) as fleet_total from fleet_aircraft;
select count(distinct registration) as fleet_unique_registration from fleet_aircraft;
select aircraft_status, count(*) from fleet_aircraft group by aircraft_status;

-- Rutas
select count(*) as routes_total from network_routes;
select count(*) as oceanic_scel_scip_both
from network_routes nr
join airports o on o.id = nr.origin_airport_id
join airports d on d.id = nr.destination_airport_id
where nr.route_category = 'OCEANIC_NATIONAL'
  and ((o.ident='SCEL' and d.ident='SCIP') or (o.ident='SCIP' and d.ident='SCEL'));

select count(*) as null_distance_routes from network_routes where distance_nm is null;
