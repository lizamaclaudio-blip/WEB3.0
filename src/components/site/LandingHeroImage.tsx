import Image from "next/image";

export function LandingHeroImage() {
  return (
    <section className="pw-sur-featured-box">
      <div className="pw-sur-featured-content p-0">
        <div className="relative overflow-hidden rounded-[8px]">
          <Image
            src="/branding/hero-banner.png"
            alt="Patagonia Wings aircraft"
            width={1536}
            height={864}
            className="h-auto w-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#073763]/80 via-[#073763]/25 to-transparent" />
          <div className="absolute left-6 top-6 max-w-xl text-white sm:left-10 sm:top-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-200">Patagonia Wings Operations</p>
            <h2 className="mt-2 font-[family-name:var(--font-rajdhani)] text-4xl font-bold leading-none sm:text-6xl">
              Chile · Patagonia · Latinoamérica
            </h2>
            <p className="mt-3 max-w-md text-sm text-sky-50 sm:text-base">
              Una plataforma operacional para despacho, ACARS, progresión y vuelos virtuales.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
