import { LandingCallout } from "@/components/site/LandingCallout";
import { LandingCounters } from "@/components/site/LandingCounters";
import { LandingHeroImage } from "@/components/site/LandingHeroImage";
import { LandingPublicOverview } from "@/components/site/LandingPublicOverview";
import { NearbyAttractionsPanel } from "@/components/places/NearbyAttractionsPanel";
import { PublicFooter } from "@/components/site/PublicFooter";
import { PublicHeader } from "@/components/site/PublicHeader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <PublicHeader />

      <section className="pw-sur-page-header">
        <div className="pw-sur-container">
          <p className="pw-sur-eyebrow">Aerolínea virtual</p>
          <h1>Bienvenido a Patagonia Wings!</h1>
          <p>La nueva plataforma virtual para pilotos, despacho, ACARS, progresión y operaciones aéreas.</p>
        </div>
      </section>

      <section id="estadisticas" className="scroll-mt-24">
        <LandingCounters />
      </section>

      <div className="pw-sur-container py-8">
        <LandingCallout />
        <LandingHeroImage />
        <LandingPublicOverview />
        <div className="mt-8">
          <NearbyAttractionsPanel
            lat={-41.4389}
            lng={-73.094}
            radiusKm={20}
            title="Atracciones cercanas"
          />
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}
