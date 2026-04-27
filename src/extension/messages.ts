import type { ProductSnapshot, SearchRun } from "@core/types";

export type ExtensionRequest =
  | { type: "EXTRACT_CURRENT_PRODUCT" }
  | { type: "RUN_ALTERNATIVE_SEARCH" };

export type ExtensionResponse =
  | { ok: true; product: ProductSnapshot }
  | { ok: true; run: SearchRun }
  | { ok: false; error: string };

export function sendMessage<T extends ExtensionResponse>(message: ExtensionRequest): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
