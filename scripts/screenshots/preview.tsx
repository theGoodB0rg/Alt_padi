// Renders the real side panel with a captured live run (run.json), for README screenshots.
import { createRoot } from "react-dom/client";
import type { SearchProgress, SearchRun } from "@core/types";
import { SidePanel } from "@ui/SidePanel";
import "@ui/styles.css";
import capturedRun from "./run.json";

const mode = new URLSearchParams(location.search).get("mode") ?? "idle";
const run = capturedRun as SearchRun;

const find = (onProgress: (progress: SearchProgress) => void) =>
  new Promise<SearchRun>((resolve) => {
    onProgress({ stage: "searching", done: 3, total: 5 });
    if (mode !== "loading") resolve(run);
  });

createRoot(document.getElementById("root")!).render(<SidePanel onFindAlternatives={find} />);
