"use client";

import { useState } from "react";

type IcaoFlagBadgeSize = "sm" | "md" | "lg";

type IcaoFlagBadgeProps = {
  /**
   * Preferred prop for ICAO/airport ident.
   */
  icao?: string | null;
  /**
   * Alias used by newer PW3 screens.
   */
  ident?: string | null;
  /**
   * Backward-compatible alias from the previous repo/components.
   */
  code?: string | null;
  countryCode?: string | null;
  size?: IcaoFlagBadgeSize;
  className?: string;
  /**
   * Backward-compatible option from older screens.
   * When false, only the flag is rendered.
   */
  showCode?: boolean;
};

const ICAO_PREFIX_TO_COUNTRY: Array<[string, string]> = [
  ["SC", "CL"],
  ["SA", "AR"],
  ["SB", "BR"],
  ["SD", "BR"],
  ["SJ", "BR"],
  ["SN", "BR"],
  ["SS", "BR"],
  ["SW", "BR"],
  ["SY", "BR"],
  ["SP", "PE"],
  ["SK", "CO"],
  ["SE", "EC"],
  ["SU", "UY"],
  ["SG", "PY"],
  ["SL", "BO"],
  ["SV", "VE"],
  ["MM", "MX"],
  ["LE", "ES"],
  ["GC", "ES"],
  ["LF", "FR"],
  ["EG", "GB"],
  ["ED", "DE"],
  ["ET", "DE"],
  ["LI", "IT"],
  ["LP", "PT"],
  ["EH", "NL"],
  ["EB", "BE"],
  ["LS", "CH"],
  ["LO", "AT"],
  ["LT", "TR"],
  ["LG", "GR"],
  ["RJ", "JP"],
  ["RO", "JP"],
  ["NZ", "NZ"],
  ["FA", "ZA"],
];

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  CHILE: "CL",
  ARGENTINA: "AR",
  BRASIL: "BR",
  BRAZIL: "BR",
  PERU: "PE",
  COLOMBIA: "CO",
  ECUADOR: "EC",
  URUGUAY: "UY",
  PARAGUAY: "PY",
  BOLIVIA: "BO",
  VENEZUELA: "VE",
  "ESTADOS UNIDOS": "US",
  "UNITED STATES": "US",
  USA: "US",
  US: "US",
  MEXICO: "MX",
  ESPANA: "ES",
  SPAIN: "ES",
  FRANCIA: "FR",
  FRANCE: "FR",
  "REINO UNIDO": "GB",
  "UNITED KINGDOM": "GB",
  UK: "GB",
  ENGLAND: "GB",
  INGLATERRA: "GB",
  ALEMANIA: "DE",
  GERMANY: "DE",
  ITALIA: "IT",
  ITALY: "IT",
  PORTUGAL: "PT",
  "PAISES BAJOS": "NL",
  NETHERLANDS: "NL",
  BELGICA: "BE",
  BELGIUM: "BE",
  SUIZA: "CH",
  SWITZERLAND: "CH",
  AUSTRIA: "AT",
  TURQUIA: "TR",
  TURKEY: "TR",
  GRECIA: "GR",
  GREECE: "GR",
  JAPON: "JP",
  JAPAN: "JP",
  CHINA: "CN",
  AUSTRALIA: "AU",
  "NUEVA ZELANDA": "NZ",
  "NEW ZEALAND": "NZ",
  SUDAFRICA: "ZA",
  "SOUTH AFRICA": "ZA",
};

const SIZE_STYLE: Record<
  IcaoFlagBadgeSize,
  {
    padding: string;
    fontSize: number;
    flagWidth: number;
    flagHeight: number;
    minHeight: number;
    gap: number;
  }
> = {
  sm: {
    padding: "4px 8px",
    fontSize: 12,
    flagWidth: 18,
    flagHeight: 13,
    minHeight: 24,
    gap: 6,
  },
  md: {
    padding: "5px 10px",
    fontSize: 13,
    flagWidth: 20,
    flagHeight: 14,
    minHeight: 28,
    gap: 7,
  },
  lg: {
    padding: "6px 12px",
    fontSize: 14,
    flagWidth: 22,
    flagHeight: 16,
    minHeight: 32,
    gap: 8,
  },
};

function normalizeText(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeCountryCode(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  return COUNTRY_NAME_TO_CODE[normalized] ?? null;
}

function inferCountryCodeFromIcao(icao?: string | null) {
  const normalized = normalizeText(icao);
  if (!normalized) return null;

  const match = ICAO_PREFIX_TO_COUNTRY.find(([prefix]) => normalized.startsWith(prefix));
  if (match) return match[1];

  if (normalized.startsWith("K")) return "US";
  if (normalized.startsWith("P") || normalized.startsWith("A")) return "US";
  if (normalized.startsWith("C")) return "CA";
  if (normalized.startsWith("Y")) return "AU";
  if (normalized.startsWith("Z")) return "CN";

  return null;
}

function resolveCountryCode(countryCode?: string | null, icao?: string | null) {
  return normalizeCountryCode(countryCode) ?? inferCountryCodeFromIcao(icao);
}

function countryCodeToEmoji(countryCode?: string | null) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return "🌐";

  return code
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function flagUrl(countryCode?: string | null) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
}

export default function IcaoFlagBadge({
  icao,
  ident,
  code: legacyCode,
  countryCode,
  size = "md",
  className,
  showCode = true,
}: IcaoFlagBadgeProps) {
  const [hasFlagError, setHasFlagError] = useState(false);
  const code = normalizeText(icao || ident || legacyCode);
  const resolvedCountryCode = resolveCountryCode(countryCode, code);
  const url = flagUrl(resolvedCountryCode);
  const sizeStyle = SIZE_STYLE[size];

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sizeStyle.gap,
    minHeight: sizeStyle.minHeight,
    padding: showCode ? sizeStyle.padding : "4px 6px",
    borderRadius: 6,
    border: "1px solid #020617",
    backgroundColor: "#111827",
    color: "#ffffff",
    fontFamily: "var(--font-rajdhani), Arial, sans-serif",
    fontSize: sizeStyle.fontSize,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: ".03em",
    whiteSpace: "nowrap" as const,
    boxShadow: "inset 0 -1px 0 rgba(255,255,255,.08), 0 1px 2px rgba(15,23,42,.18)",
  };

  if (!code) {
    return (
      <span className={className} style={baseStyle}>
        {showCode ? "SIN UBICACION" : countryCodeToEmoji(resolvedCountryCode)}
      </span>
    );
  }

  return (
    <span className={className} title={code} style={baseStyle}>
      {url && !hasFlagError ? (
        <img
          src={url}
          alt={`Bandera ${resolvedCountryCode ?? code}`}
          width={sizeStyle.flagWidth}
          height={sizeStyle.flagHeight}
          loading="lazy"
          decoding="async"
          onError={() => setHasFlagError(true)}
          style={{
            width: sizeStyle.flagWidth,
            height: sizeStyle.flagHeight,
            objectFit: "cover",
            borderRadius: 2,
            display: "block",
            flex: "0 0 auto",
            boxShadow: "0 0 0 1px rgba(255,255,255,.35)",
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: sizeStyle.flagWidth,
            height: sizeStyle.flagHeight,
            fontSize: sizeStyle.flagHeight,
            lineHeight: 1,
            flex: "0 0 auto",
          }}
        >
          {countryCodeToEmoji(resolvedCountryCode)}
        </span>
      )}

      {showCode ? (
        <span
          style={{
            color: "#ffffff",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: ".03em",
            textShadow: "0 1px 0 rgba(0,0,0,.35)",
          }}
        >
          {code}
        </span>
      ) : null}
    </span>

);
}
