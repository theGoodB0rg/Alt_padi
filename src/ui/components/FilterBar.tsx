import { Check } from "lucide-react";
import type { Filters, MatchLevel } from "@ui/model/results";

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const MATCH_OPTIONS: Array<{ value: MatchLevel; label: string }> = [
  { value: "any", label: "Any" },
  { value: "good", label: "Good" },
  { value: "best", label: "Best" }
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const toggle = (key: "cheaperOnly" | "sameBrandOnly") => onChange({ ...filters, [key]: !filters[key] });
  return (
    <div className="filters" role="group" aria-label="Filters">
      <Chip pressed={filters.cheaperOnly} onClick={() => toggle("cheaperOnly")}>
        Cheaper only
      </Chip>
      <Chip pressed={filters.sameBrandOnly} onClick={() => toggle("sameBrandOnly")}>
        Same brand
      </Chip>
      <div className="segmented" role="group" aria-label="Match">
        {MATCH_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filters.minMatch === option.value}
            onClick={() => onChange({ ...filters, minMatch: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button className="chip" type="button" aria-pressed={pressed} onClick={onClick}>
      <Check aria-hidden="true" />
      {children}
    </button>
  );
}
