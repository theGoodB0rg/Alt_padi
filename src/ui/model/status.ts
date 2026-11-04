import type { SearchProgress } from "@core/types";

export type StepStatus = "waiting" | "active" | "done";

export interface ProgressStep {
  label: string;
  detail?: string;
  status: StepStatus;
}

const STAGE_INDEX: Record<SearchProgress["stage"], number> = { reading: 0, searching: 1, comparing: 2 };

export function progressSteps(progress: SearchProgress | undefined): ProgressStep[] {
  const current = progress ? STAGE_INDEX[progress.stage] : 0;
  const status = (index: number): StepStatus => (index < current ? "done" : index === current ? "active" : "waiting");
  return [
    { label: "Reading this product", status: status(0) },
    {
      label: "Searching Jumia",
      detail: progress?.stage === "searching" ? `${progress.done} of ${progress.total}` : undefined,
      status: status(1)
    },
    {
      label: "Comparing listings",
      detail: progress?.stage === "comparing" ? `${progress.found} found` : undefined,
      status: status(2)
    }
  ];
}

export interface FriendlyError {
  kind: "not-product" | "offline" | "failed";
  title: string;
  body: string;
}

export function describeError(message: string): FriendlyError {
  if (/product page/i.test(message)) {
    return {
      kind: "not-product",
      title: "Open a Jumia product",
      body: "Go to any product page on jumia.com.ng, then try again."
    };
  }
  if (/fetch|network|HTTP \d|abort|timed? ?out/i.test(message)) {
    return {
      kind: "offline",
      title: "Couldn't reach Jumia",
      body: "Check your internet connection, then try again."
    };
  }
  return { kind: "failed", title: "Something went wrong", body: message };
}
