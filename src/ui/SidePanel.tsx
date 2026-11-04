import { AlertTriangle, MousePointerClick, Search, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import type { SearchRun } from "@core/types";
import { DEFAULT_FILTERS, filterCandidates, groupCandidates, type Filters } from "@ui/model/results";
import type { FriendlyError } from "@ui/model/status";
import { useSearch, type FindAlternatives } from "@ui/hooks/useSearch";
import { EmptyState } from "@ui/components/EmptyState";
import { FilterBar } from "@ui/components/FilterBar";
import { Header } from "@ui/components/Header";
import { ProductSummary } from "@ui/components/ProductSummary";
import { ResultList } from "@ui/components/ResultList";
import { Searching } from "@ui/components/Searching";
import { VerdictCard } from "@ui/components/VerdictCard";

export type { FindAlternatives };

const ERROR_ICONS = { "not-product": MousePointerClick, offline: WifiOff, failed: AlertTriangle } as const;
const NO_FILTERS: Filters = { cheaperOnly: false, sameBrandOnly: false, minMatch: "any" };

export function SidePanel({ onFindAlternatives }: { onFindAlternatives: FindAlternatives }) {
  const { state, start, stop } = useSearch(onFindAlternatives);

  return (
    <div className="panel">
      <Header busy={state.status === "loading"} onRefresh={state.status === "done" ? start : undefined} />
      {/* The key replays the entrance animation each time the screen changes. */}
      <main className="panelBody enter" key={state.status}>
        {state.status === "idle" && <StartScreen onStart={start} />}
        {state.status === "loading" && <Searching progress={state.progress} onStop={stop} />}
        {state.status === "error" && <ErrorScreen error={state.error} onRetry={start} />}
        {state.status === "done" && <Results run={state.run} />}
      </main>
      <footer className="panelFoot">Searches Jumia only when you ask. No account, no tracking.</footer>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Is this the best price?"
      body="Open any Jumia product, then check. We compare it with other listings on Jumia."
    >
      <button className="button primary wide" type="button" onClick={onStart}>
        <Search size={16} aria-hidden="true" /> Check prices
      </button>
    </EmptyState>
  );
}

function ErrorScreen({ error, onRetry }: { error: FriendlyError; onRetry: () => void }) {
  return (
    <EmptyState icon={ERROR_ICONS[error.kind]} title={error.title} body={error.body} tone={error.kind === "not-product" ? "neutral" : "danger"}>
      <button className="button quiet" type="button" onClick={onRetry}>
        Try again
      </button>
    </EmptyState>
  );
}

function Results({ run }: { run: SearchRun }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const groups = useMemo(() => groupCandidates(filterCandidates(run, filters)), [run, filters]);
  const mainCount = groups.sameItem.length + groups.variant.length + groups.alternative.length;
  const cheapest = run.summary?.sourceIsCheapest ? undefined : run.summary?.cheapestSameItem;

  return (
    <>
      <ProductSummary product={run.sourceProduct} />
      <VerdictCard run={run} />
      {run.errors.length > 0 && (
        <p className="notice" title={run.errors.join("\n")}>
          <AlertTriangle size={14} aria-hidden="true" />
          Some pages didn't load, so results may be incomplete.
        </p>
      )}
      <FilterBar filters={filters} onChange={setFilters} />
      {mainCount === 0 && (
        <p className="nothing">
          Nothing matches these filters.{" "}
          <button type="button" onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </button>
        </p>
      )}
      <ResultList groups={groups} cheapestUrl={cheapest?.product.url} />
    </>
  );
}
