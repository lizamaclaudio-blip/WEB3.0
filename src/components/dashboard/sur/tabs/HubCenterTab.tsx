import { PilotRepositioningPanel } from "@/components/dashboard/sur/PilotRepositioningPanel";
import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";
import AirportHeroImage from "@/components/dashboard/sur/AirportHeroImage";
import AirportMetarPanel from "@/components/dashboard/sur/AirportMetarPanel";
import WeatherOperationalAdvisory from "@/components/dashboard/sur/WeatherOperationalAdvisory";
import AirportActivityPanel from "@/components/dashboard/sur/AirportActivityPanel";
import AirportPilotsBadge from "@/components/dashboard/sur/AirportPilotsBadge";
import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";

const icons = {
  people: String.fromCodePoint(0x1f465),
  bell: String.fromCodePoint(0x1f514),
  antenna: String.fromCodePoint(0x1f4e1),
  departure: String.fromCodePoint(0x2191),
  arrival: String.fromCodePoint(0x2193),
  news: String.fromCodePoint(0x1f4f0),
  star: String.fromCodePoint(0x2b50),
};

export function HubCenterTab({ data }: { data?: CrewCenterData }) {
  const airport = data?.airport;
  const icao = airport?.icao || "";

  return (
    <div className="pw-sur-tab-stack">
      <article className="pw-sur-airport-card">
        <header>
          <h3>{airport?.country || "No registrado"}</h3>
          <IcaoFlagBadge code={icao || "N/A"} showCode={false} />
        </header>
        <div className="pw-sur-airport-name">{airport?.name || "Aeropuerto no configurado"} <small>({icao || "N/A"})</small></div>
        <div className="pw-sur-airport-body">
          {icao ? (
            <AirportHeroImage
              icao={icao}
              airportName={airport?.name || "Aeropuerto no configurado"}
              city={airport?.city || "No registrado"}
              country={airport?.country || "No registrado"}
              lat={airport?.lat}
              lng={airport?.lng}
              className="pw-sur-airport-visual"
              subject="tourism"
            />
          ) : (
            <div className="pw-sur-airport-visual grid place-items-center text-sm font-bold text-slate-500">Aeropuerto no configurado</div>
          )}
          {icao ? (
            <AirportMetarPanel
              icao={icao}
              footerAside={<AirportPilotsBadge ident={icao} icon={icons.people} />}
            />
          ) : (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">METAR no disponible.</div>
          )}
        </div>
        <footer>
          <div className="pw-sur-airport-footer-icon">{icons.bell}</div>
          <div className="pw-sur-notam-stack">
            <p><strong>NOTAMs {icao || "N/A"}</strong></p>
            {icao ? <WeatherOperationalAdvisory ident={icao} /> : null}
          </div>
        </footer>
      </article>

      <PilotRepositioningPanel
        currentAirportFromHub={airport ? { ident: airport.icao, name: airport.name, city: airport.city, country: airport.country } : null}
        baseAirportFromHub={data?.pilot?.baseIcao ? { ident: data.pilot.baseIcao, name: "Hub base" } : null}
        isCrewDataLoading={!data}
      />

      {icao ? <AirportActivityPanel ident={icao} icons={icons} /> : null}

      <div className="pw-sur-two-col">
        <section>
          <h3 className="pw-sur-heading">{icons.news} Últimos Acontecimientos</h3>
          <div className="pw-sur-feed"><p className="p-3 text-sm text-slate-600">Sin datos.</p></div>
        </section>
        <section>
          <h3 className="pw-sur-heading">{icons.bell} NOTAMs</h3>
          <div className="pw-sur-feed" />
        </section>
      </div>

      <section>
        <h3 className="pw-sur-heading">{icons.star} Ranking</h3>
        <div className="pw-sur-ranking-grid"><article className="pw-sur-ranking-card"><header>Ranking no disponible</header><p className="p-3 text-sm text-slate-600">No hay tabla real de ranking configurada.</p></article></div>
      </section>
    </div>
  );
}
