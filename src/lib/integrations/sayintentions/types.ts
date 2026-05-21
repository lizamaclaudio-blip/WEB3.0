export type SayIntentionsWeather = {
  airport: string;
  atis?: string | null;
  atis_cpdlc?: string | null;
  metar?: string | null;
  taf?: string | null;
  active_runway?: string | null;
  wind_direction?: number | null;
  wind_speed?: number | null;
};

export type SayIntentionsCommsFrequency = {
  type?: string | null;
  freq?: string | null;
  callsign?: string | null;
  airport?: string | null;
};

export type SayIntentionsCommsHistoryEntry = {
  id?: number | string;
  ident?: string | null;
  lat?: number | null;
  lon?: number | null;
  frequency?: string | null;
  channel?: string | null;
  stamp_zulu?: string | null;
  station_name?: string | null;
  outgoing_message?: string | null;
  incoming_message?: string | null;
};

export type SayIntentionsFlightJsonContext = {
  api_key?: string | null;
  callsign?: string | null;
  current_airport?: string | null;
  flight_origin?: string | null;
  flight_destination?: string | null;
  assigned_gate?: string | null;
  flight_plan_route?: string | null;
  flight_plan_departing_runway?: string | null;
  flight_plan_arriving_runway?: string | null;
};

export type SayIntentionsVAImportPayload = {
  va_api_key: string;
  crew_data?: string;
  dispatcher_data?: string;
  copilot_data?: string;
  skyops_data?: string;
};

