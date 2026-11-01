import { AlertTriangle, CheckCircle2, ExternalLink, Search, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { CandidateScore, MatchKind, SearchRun } from "@core/types";

interface SidePanelProps {
  onFindAlternatives: () => Promise<SearchRun>;
}

type ConfidenceFilter = "low" | "medium" | "high";

const confidenceRank: Record<ConfidenceFilter, number> = {
  low: 0,
  medium: 1,
  high: 2
};

const SECTIONS: Array<{ match: MatchKind; title: string; hint: string; collapsed?: boolean }> = [
  { match: "same-item", title: "Same item, other sellers", hint: "Same model and configuration" },
  { match: "variant", title: "Other sizes & configurations", hint: "Same product, different size, capacity or pack" },
  { match: "alternative", title: "Similar alternatives", hint: "Comparable products you may also consider" },
  { match: "accessory", title: "Related items", hint: "Made for or named after this item (accessories, parts, add-ons) — not the item itself", collapsed: true }
];

export function SidePanel({ onFindAlternatives }: SidePanelProps) {
  const [run, setRun] = useState<SearchRun | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cheaperOnly, setCheaperOnly] = useState(true);
  const [sameBrandOnly, setSameBrandOnly] = useState(false);
  const [minConfidence, setMinConfidence] = useState<ConfidenceFilter>("low");

  const candidates = useMemo(() => {
    return (run?.candidates ?? []).filter((candidate) => {
      if (candidate.match === "unrelated") return false;
      // Accessories are suggestions: cheaper-than-a-phone is meaningless for a pouch.
      if (cheaperOnly && candidate.match !== "accessory" && (candidate.priceDelta ?? 0) <= 0) return false;
      if (
        sameBrandOnly &&
        run?.sourceProduct.brand &&
        candidate.product.brand?.toLowerCase() !== run.sourceProduct.brand.toLowerCase()
      ) {
        return false;
      }
      if (candidate.match === "accessory" || candidate.suspicious) return true;
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

      {run && <Verdict run={run} />}

      {run && candidates.filter((c) => c.match !== "accessory").length === 0 && (
        <p className="empty">No cheaper matches for the current filters.</p>
      )}

      {SECTIONS.map((section) => {
        const items = candidates.filter((c) => c.match === section.match && !c.suspicious);
        if (!items.length) return null;
        if (section.match === "same-item") items.sort(byPrice);
        const body = (
          <div className="results">
            {items.map((candidate) => (
              <ResultCard key={candidate.product.url} candidate={candidate} />
            ))}
          </div>
        );
        return section.collapsed ? (
          <details className="group" key={section.match}>
            <summary>
              {section.title} <span className="count">{items.length}</span>
              <small>{section.hint}</small>
            </summary>
            {body}
          </details>
        ) : (
          <section className="group" key={section.match} aria-label={section.title}>
            <h3>
              {section.title} <span className="count">{items.length}</span>
            </h3>
            <small>{section.hint}</small>
            {body}
          </section>
        );
      })}

      {candidates.some((c) => c.suspicious) && (
        <details className="group">
          <summary>
            Suspiciously cheap <span className="count">{candidates.filter((c) => c.suspicious).length}</span>
            <small>Same name, implausible price — often a part, accessory or bait listing</small>
          </summary>
          <div className="results">
            {candidates.filter((c) => c.suspicious).map((candidate) => (
              <ResultCard key={candidate.product.url} candidate={candidate} />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}

function byPrice(a: CandidateScore, b: CandidateScore): number {
  return (a.product.price?.amount ?? Infinity) - (b.product.price?.amount ?? Infinity);
}

function Verdict({ run }: { run: SearchRun }) {
  const summary = run.summary;
  if (!summary) return null;
  const source = run.sourceProduct.price?.amount;
  const cheapest = summary.cheapestSameItem;
  if (cheapest && !summary.sourceIsCheapest && source && cheapest.product.price) {
    const saving = source - cheapest.product.price.amount;
    return (
      <section className="verdict save" aria-label="Verdict">
        <TrendingDown size={18} aria-hidden="true" />
        <div>
          <strong>
            Same item for {formatMoney(cheapest.product.price.amount)} — save {formatMoney(saving)}
          </strong>
          <span>
            Cheapest of {summary.sameItemCount} matching listing{summary.sameItemCount === 1 ? "" : "s"} found.{" "}
            <a href={cheapest.product.url} target="_blank" rel="noreferrer">
              Open it
            </a>
          </span>
        </div>
      </section>
    );
  }
  return (
    <section className="verdict ok" aria-label="Verdict">
      <CheckCircle2 size={18} aria-hidden="true" />
      <div>
        <strong>
          {summary.sameItemCount
            ? "You're already on the cheapest listing we found"
            : "No other listing of this exact item found"}
        </strong>
        <span>
          {summary.sameItemCount
            ? `Compared against ${summary.sameItemCount} other listing${summary.sameItemCount === 1 ? "" : "s"} of the same item${
                summary.sameItemPriceRange ? ` (${formatMoney(summary.sameItemPriceRange.min)}–${formatMoney(summary.sameItemPriceRange.max)})` : ""
              }.`
            : "See similar alternatives below."}
          {summary.suspiciousCount > 0 && ` Ignored ${summary.suspiciousCount} implausibly cheap listing${summary.suspiciousCount === 1 ? "" : "s"}.`}
        </span>
      </div>
    </section>
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
          {candidate.match !== "accessory" && candidate.priceDelta !== undefined && candidate.priceDelta > 0 && (
            <span>{formatMoney(candidate.priceDelta)} cheaper</span>
          )}
          {candidate.unitPrice && (
            <span>
              {formatMoney(candidate.unitPrice.amount)}/{candidate.unitPrice.unit}
            </span>
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
          {candidate.reasons.filter((r) => candidate.match !== "accessory" || r !== "cheaper price").map((reason) => (
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
