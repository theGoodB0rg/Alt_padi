import { AlertTriangle, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { CandidateScore, SearchRun } from "@core/types";

interface SidePanelProps {
  onFindAlternatives: () => Promise<SearchRun>;
}

type ConfidenceFilter = "low" | "medium" | "high";

const confidenceRank: Record<ConfidenceFilter, number> = {
  low: 0,
  medium: 1,
  high: 2
};

export function SidePanel({ onFindAlternatives }: SidePanelProps) {
  const [run, setRun] = useState<SearchRun | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cheaperOnly, setCheaperOnly] = useState(true);
  const [sameBrandOnly, setSameBrandOnly] = useState(false);
  const [minConfidence, setMinConfidence] = useState<ConfidenceFilter>("low");

  const candidates = useMemo(() => {
    return (run?.candidates ?? []).filter((candidate) => {
      if (cheaperOnly && (candidate.priceDelta ?? 0) <= 0) return false;
      if (
        sameBrandOnly &&
        run?.sourceProduct.brand &&
        candidate.product.brand?.toLowerCase() !== run.sourceProduct.brand.toLowerCase()
      ) {
        return false;
      }
      return confidenceRank[candidate.confidence] >= confidenceRank[minConfidence];
    });
  }, [cheaperOnly, minConfidence, run, sameBrandOnly]);

  async function handleSearch() {
    setError(undefined);
    setIsLoading(true);
    try {
      setRun(await onFindAlternatives());
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : String(searchError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Cheaper Jumia Alternatives</p>
          <h1>AltPadi</h1>
        </div>
        <button className="primary" type="button" onClick={handleSearch} disabled={isLoading}>
          <Search size={16} aria-hidden="true" />
          {isLoading ? "Searching..." : "Find cheaper alternatives"}
        </button>
      </header>

      {run?.sourceProduct && (
        <section className="source" aria-label="Current product">
          <span>Current product</span>
          <strong>{run.sourceProduct.title}</strong>
          {run.sourceProduct.price && <em>{formatMoney(run.sourceProduct.price.amount)}</em>}
        </section>
      )}

      <section className="filters" aria-label="Result filters">
        <label>
          <input
            type="checkbox"
            checked={cheaperOnly}
            onChange={(event) => setCheaperOnly(event.target.checked)}
            aria-label="Cheaper only"
          />
          Cheaper only
        </label>
        <label>
          <input
            type="checkbox"
            checked={sameBrandOnly}
            onChange={(event) => setSameBrandOnly(event.target.checked)}
            aria-label="Same brand"
          />
          Same brand
        </label>
        <label>
          Minimum confidence
          <select
            value={minConfidence}
            onChange={(event) => setMinConfidence(event.target.value as ConfidenceFilter)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </section>

      {error && (
        <div className="notice error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {run?.errors.map((runError) => (
        <div className="notice" role="status" key={runError}>
          <AlertTriangle size={16} aria-hidden="true" />
          {runError}
        </div>
      ))}

      {!run && !error && (
        <p className="empty">
          Open a Jumia product page, then search when you are ready. Nothing is fetched
          automatically.
        </p>
      )}

      {run && candidates.length === 0 && (
        <p className="empty">No cheaper alternatives matched the current filters.</p>
      )}

      <section className="results" aria-label="Alternative products">
        {candidates.map((candidate) => (
          <ResultCard key={candidate.product.url} candidate={candidate} />
        ))}
      </section>
    </main>
  );
}

function ResultCard({ candidate }: { candidate: CandidateScore }) {
  return (
    <article className="result">
      {candidate.product.imageUrl && (
        <img src={candidate.product.imageUrl} alt="" width={80} height={80} />
      )}
      <div className="resultBody">
        <div className="resultTop">
          <h2>{candidate.product.title}</h2>
          <span className={`confidence ${candidate.confidence}`}>{candidate.confidence}</span>
        </div>
        <div className="priceRow">
          {candidate.product.price && <strong>{formatMoney(candidate.product.price.amount)}</strong>}
          {candidate.priceDelta !== undefined && candidate.priceDelta > 0 && (
            <span>{formatMoney(candidate.priceDelta)} cheaper</span>
          )}
        </div>
        <div className="meta">
          {candidate.product.rating && <span>{candidate.product.rating.toFixed(1)} rating</span>}
          {candidate.product.reviewCount !== undefined && (
            <span>{candidate.product.reviewCount} reviews</span>
          )}
          <span>{candidate.totalScore}/100 score</span>
        </div>
        <div className="chips">
          {candidate.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
          {candidate.warnings.map((warning) => (
            <span className="warning" key={warning}>
              {warning}
            </span>
          ))}
        </div>
        <a className="openLink" href={candidate.product.url} target="_blank" rel="noreferrer">
          Open on Jumia <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}
