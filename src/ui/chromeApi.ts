import type { SearchProgress, SearchRun } from "@core/types";
import { isSearchProgressEvent, sendMessage } from "@extension/messages";

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
