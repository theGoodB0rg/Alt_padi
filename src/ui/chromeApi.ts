import type { SearchRun } from "@core/types";
import { sendMessage } from "@extension/messages";

export async function findAlternatives(): Promise<SearchRun> {
  const response = await sendMessage({ type: "RUN_ALTERNATIVE_SEARCH" });
  if (!response.ok || !("run" in response)) {
    throw new Error(response.ok ? "Search failed." : response.error);
  }
  return response.run;
}
