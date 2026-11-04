import type { ProductSnapshot, SearchProgress, SearchRun } from "@core/types";

export type ExtensionRequest =
  | { type: "EXTRACT_CURRENT_PRODUCT" }
  | { type: "RUN_ALTERNATIVE_SEARCH" };

export type ExtensionResponse =
  | { ok: true; product: ProductSnapshot }
  | { ok: true; run: SearchRun }
  | { ok: false; error: string };

/** Pushed from the background worker to the side panel while a search runs. */
export interface SearchProgressEvent {
  type: "SEARCH_PROGRESS";
  progress: SearchProgress;
}

export function isSearchProgressEvent(message: unknown): message is SearchProgressEvent {
  return (message as SearchProgressEvent | undefined)?.type === "SEARCH_PROGRESS";
}

export function sendMessage<T extends ExtensionResponse>(message: ExtensionRequest): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
