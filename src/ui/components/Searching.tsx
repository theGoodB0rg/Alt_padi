import { Check, X } from "lucide-react";
import type { SearchProgress } from "@core/types";
import { progressSteps } from "@ui/model/status";

interface SearchingProps {
  progress?: SearchProgress;
  onStop: () => void;
}

const SKELETON_WIDTHS = [88, 76, 82];

/** Named steps plus result-shaped placeholders: the panel shows it is working, not the cursor. */
export function Searching({ progress, onStop }: SearchingProps) {
  return (
    <>
      <div className="steps" role="status" aria-label="Search progress">
        {progressSteps(progress).map((step) => (
          <div className={`step ${step.status}`} key={step.label}>
            <span className="dot">
              <Check aria-hidden="true" />
            </span>
            {step.label}
            {step.detail && <span className="stepDetail num">{step.detail}</span>}
          </div>
        ))}
      </div>
      <div className="searchingFoot">
        <span>Usually takes 10–20 seconds</span>
        <button className="button quiet" type="button" onClick={onStop}>
          <X size={14} aria-hidden="true" /> Stop
        </button>
      </div>
      {SKELETON_WIDTHS.map((width) => (
        <div className="skeleton" key={width} aria-hidden="true">
          <div className="shimmer thumbShape" />
          <div className="skeletonLines">
            <div className="shimmer" style={{ width: `${width}%` }} />
            <div className="shimmer" style={{ width: `${width - 28}%` }} />
            <div className="shimmer priceShape" />
          </div>
        </div>
      ))}
    </>
  );
}
