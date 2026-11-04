import { useCallback, useEffect, useState } from "react";
import type { SearchRun } from "@core/types";
import { EMPTY_STATS, recordCheck, type SavingsStats, type SavingsStore } from "@ui/model/savings";

export function useSavings(store?: SavingsStore) {
  const [stats, setStats] = useState<SavingsStats>(EMPTY_STATS);

  useEffect(() => {
    let live = true;
    store?.load().then((loaded) => live && setStats(loaded), () => {});
    return () => {
      live = false;
    };
  }, [store]);

  const record = useCallback(
    (run: SearchRun) => {
      if (!store) return;
      // Read-modify-write from storage, not from state, so two panels can't overwrite each other.
      void store
        .load()
        .then((current) => recordCheck(current, run))
        .then(async (next) => {
          await store.save(next);
          setStats(next);
        })
        .catch(() => {});
    },
    [store]
  );

  return { stats, record };
}
