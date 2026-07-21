export type HomeHeroKind = "confirmation" | "poll" | "decision" | "follow-up" | "recommend";

export interface HomeHeroInput {
  needsConfirmation: boolean;
  needsPollResponse: boolean;
  hasPlannedLunch: boolean;
  hasCompletedLunch: boolean;
}

export function selectHomeHero(input: HomeHeroInput): HomeHeroKind {
  if (input.needsConfirmation) return "confirmation";
  if (input.needsPollResponse) return "poll";
  if (input.hasPlannedLunch) return "decision";
  if (input.hasCompletedLunch) return "follow-up";
  return "recommend";
}
