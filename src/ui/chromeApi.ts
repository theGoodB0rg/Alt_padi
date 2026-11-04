import type { SearchProgress, SearchRun } from "@core/types";
import { isSearchProgressEvent, sendMessage } from "@extension/messages";
import { EMPTY_STATS, type SavingsStats, type SavingsStore } from "@ui/model/savings";

export async function findAlternatives(onProgress: (progress: SearchProgress) => void): Promise<SearchRun> {
  const listener = (message: unknown) => {
    if (isSearchProgressEvent(message)) onProgress(message.progress);
  };
  chrome.runtime.onMessage.addListener(listener);
  try {
    const response = await sendMessage({ type: "RUN_ALTERNATIVE_SEARCH" });
    if (!response.ok || !("run" in response)) {
      throw new Error(response.ok ? "Search failed." : response.error);
    }
    return response.run;
  } finally {
    chrome.runtime.onMessage.removeListener(listener);
  }
}

const STATS_KEY = "savingsStats";

export const savingsStore: SavingsStore = {
  async load() {
    const stored = await chrome.storage.local.get(STATS_KEY);
    return (stored[STATS_KEY] as SavingsStats | undefined) ?? EMPTY_STATS;
  },
  async save(stats) {
    await chrome.storage.local.set({ [STATS_KEY]: stats });
  }
};

export async function isPinned(): Promise<boolean> {
  return (await chrome.action.getUserSettings()).isOnToolbar;
}
