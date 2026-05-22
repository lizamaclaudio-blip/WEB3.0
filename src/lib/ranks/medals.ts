export type RankMedal = {
  code: string;
  name: string;
  level: number;
  medalUrl: string;
};

const RANK_MEDALS: RankMedal[] = [
  { code: "CADET", name: "Cadet", level: 1, medalUrl: "/images/ranks/cadet-school.png" },
  { code: "SECOND_OFFICER", name: "Second Officer", level: 2, medalUrl: "/images/ranks/second-officer.png" },
  { code: "FIRST_OFFICER", name: "First Officer", level: 3, medalUrl: "/images/ranks/first-officer.png" },
  { code: "SENIOR_FIRST_OFFICER", name: "Senior First Officer", level: 4, medalUrl: "/images/ranks/senior-first-officer.png" },
  { code: "CAPTAIN", name: "Captain", level: 5, medalUrl: "/images/ranks/captain.png" },
  { code: "SENIOR_CAPTAIN", name: "Senior Captain", level: 6, medalUrl: "/images/ranks/senior-captain.png" },
  { code: "TRAINING_CAPTAIN", name: "Training Captain", level: 7, medalUrl: "/images/ranks/line-check-captain.png" },
  { code: "COMMANDER", name: "Commander", level: 8, medalUrl: "/images/ranks/international-commander.png" },
  { code: "SENIOR_COMMANDER", name: "Senior Commander", level: 9, medalUrl: "/images/ranks/international-commander.png" },
  { code: "CHIEF_PILOT", name: "Chief Pilot", level: 10, medalUrl: "/images/ranks/line-check-captain.png" },
];

const DEFAULT_RANK = RANK_MEDALS[0];

export function getRankMedal(rankCode: string | null | undefined): RankMedal {
  const code = String(rankCode ?? "").trim().toUpperCase();
  if (!code) return DEFAULT_RANK;
  return RANK_MEDALS.find((item) => item.code === code) ?? {
    code,
    name: code.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    level: DEFAULT_RANK.level,
    medalUrl: DEFAULT_RANK.medalUrl,
  };
}

export function listRankMedals(): RankMedal[] {
  return [...RANK_MEDALS];
}
