export const MAX_ROULETTE_SLOTS = 64;

export interface RouletteEntry {
  id: string;
  name: string;
  weight: number;
}

export function getTotalSlots(entries: RouletteEntry[]): number {
  return entries.reduce((total, entry) => total + entry.weight, 0);
}

export function changeEntryWeight(
  entries: RouletteEntry[],
  id: string,
  delta: -1 | 1
): RouletteEntry[] {
  const entry = entries.find((item) => item.id === id);
  if (!entry || entry.weight + delta < 1 || (delta > 0 && getTotalSlots(entries) >= MAX_ROULETTE_SLOTS)) {
    return entries;
  }

  return entries.map((item) => (item.id === id ? { ...item, weight: item.weight + delta } : item));
}

export function removeEntry(entries: RouletteEntry[], id: string): RouletteEntry[] {
  if (entries.length <= 1 || !entries.some((entry) => entry.id === id)) {
    return entries;
  }
  return entries.filter((entry) => entry.id !== id);
}

export function addEntry(entries: RouletteEntry[], entry: Omit<RouletteEntry, "weight">): RouletteEntry[] {
  if (getTotalSlots(entries) >= MAX_ROULETTE_SLOTS || entries.some((item) => item.id === entry.id)) {
    return entries;
  }
  return [...entries, { ...entry, weight: 1 }];
}

export function pickWeightedEntry(entries: RouletteEntry[], random: () => number = Math.random): RouletteEntry | null {
  const total = getTotalSlots(entries);
  if (total === 0) {
    return null;
  }

  let remaining = random() * total;
  for (const entry of entries) {
    remaining -= entry.weight;
    if (remaining < 0) {
      return entry;
    }
  }
  return entries.at(-1) ?? null;
}
