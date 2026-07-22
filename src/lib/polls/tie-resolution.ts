export type TieResolutionMethod = "random" | "nearest" | "least_visited";

export interface TieResolutionOption {
  id: string;
  position: number;
  distanceM?: number;
  completedVisitCount?: number;
}

function byPosition(a: TieResolutionOption, b: TieResolutionOption): number {
  return a.position - b.position;
}

/**
 * Selects one option from an already-calculated set of tied winners.
 * Missing comparison data falls back to the original poll option order, so the
 * caller can safely resolve older or partially populated restaurant records.
 */
export function chooseTiedOption(
  options: TieResolutionOption[],
  method: TieResolutionMethod,
  random: () => number = Math.random
): TieResolutionOption | null {
  if (options.length === 0) {
    return null;
  }

  if (method === "random") {
    return options[Math.min(options.length - 1, Math.floor(random() * options.length))] ?? null;
  }

  const metric = method === "nearest" ? "distanceM" : "completedVisitCount";
  return [...options].sort((a, b) => {
    const aValue = a[metric];
    const bValue = b[metric];
    if (aValue === undefined && bValue === undefined) {
      return byPosition(a, b);
    }
    if (aValue === undefined) {
      return 1;
    }
    if (bValue === undefined) {
      return -1;
    }
    return aValue - bValue || byPosition(a, b);
  })[0] ?? null;
}

export function isTieResolutionMethod(value: string): value is TieResolutionMethod {
  return value === "random" || value === "nearest" || value === "least_visited";
}
