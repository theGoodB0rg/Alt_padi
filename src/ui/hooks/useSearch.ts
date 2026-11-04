import { useCallback, useRef, useState } from "react";
import type { SearchProgress, SearchRun } from "@core/types";
import { describeError, type FriendlyError } from "@ui/model/status";

export type FindAlternatives = (onProgress: (progress: SearchProgress) => void) => Promise<SearchRun>;

export type SearchState =
  | { status: "idle" }
  | { status: "loading"; progress?: SearchProgress; previous?: SearchRun }
  | { status: "done"; run: SearchRun }
  | { status: "error"; error: FriendlyError };

/**
 * One search at a time. Every start/stop bumps a token, so a result or progress event that
 * arrives after the user stopped (or restarted) is ignored instead of overwriting the screen.
 */
export function useSearch(find: FindAlternatives) {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const token = useRef(0);

  const start = useCallback(() => {
    const id = ++token.current;
    const isCurrent = () => id === token.current;
    setState((s) => ({ status: "loading", previous: s.status === "done" ? s.run : undefined }));
    find((progress) => {
      if (isCurrent()) setState((s) => (s.status === "loading" ? { ...s, progress } : s));
    }).then(
      (run) => isCurrent() && setState({ status: "done", run }),
      (error: unknown) =>
        isCurrent() &&
        setState({ status: "error", error: describeError(error instanceof Error ? error.message : String(error)) })
    );
  }, [find]);

  /** Back to the last results if there were any, otherwise to the start screen. */
  const stop = useCallback(() => {
    token.current++;
    setState((s) => (s.status === "loading" && s.previous ? { status: "done", run: s.previous } : { status: "idle" }));
  }, []);

  return { state, start, stop };
}
