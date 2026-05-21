import catalog from "./catalog.json";

export type AirlineRank = {
  rankCode: string;
  rankName: string;
  level: number;
  allowedAircraft: string[];
  maxRouteCategory: string;
  canFlyCargo: boolean;
  canFlyInternational: boolean;
  canFlyLongHaul: boolean;
};

export const AIRLINE_RANKS = catalog.ranks as AirlineRank[];

export function getAirlineRank(rankCode: string) {
  const normalized = rankCode.trim().toUpperCase();
  return AIRLINE_RANKS.find((rank) => rank.rankCode === normalized) ?? null;
}

export function rankMeetsMinimum(rankCode: string, minRankCode: string) {
  const rank = getAirlineRank(rankCode);
  const minRank = getAirlineRank(minRankCode);
  if (!rank || !minRank) return false;
  return rank.level >= minRank.level;
}
