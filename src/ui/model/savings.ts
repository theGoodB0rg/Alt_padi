import type { SearchRun } from "@core/types";
import { buildVerdict } from "@ui/model/verdict";

/** Kept on the user's own machine only. "Found", not "saved": we can't know what they bought. */
export interface SavingsStats {
  checks: number;
  /** Product URL -> latest saving found for it, so re-checks never double count. */
  found: Record<string, number>;
}

export interface SavingsStore {
  load(): Promise<SavingsStats>;
  save(stats: SavingsStats): Promise<void>;
}

export const EMPTY_STATS: SavingsStats = { checks: 0, found: {} };

export function recordCheck(stats: SavingsStats, run: SearchRun): SavingsStats {
  const verdict = buildVerdict(run);
  const found = { ...stats.found };
  if (verdict?.kind === "save") found[run.sourceProduct.url] = verdict.saving;
  return { checks: stats.checks + 1, found };
}

export function totalFound(stats: SavingsStats): number {
  return Object.values(stats.found).reduce((sum, saving) => sum + saving, 0);
}
