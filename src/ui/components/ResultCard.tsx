import { AlertTriangle, Award, Check, ChevronDown, ShieldCheck, Star, TrendingDown } from "lucide-react";
import { useId, useState } from "react";
import type { CandidateScore } from "@core/types";
import { formatMoney } from "@ui/model/format";
import { matchLabel, visibleReasons } from "@ui/model/results";
import { OpenLink } from "@ui/components/OpenLink";
import { Thumb } from "@ui/components/Thumb";

interface ResultCardProps {
  candidate: CandidateScore;
  highlight?: string;
}

/** Four things at a glance (name, price, saving, seller trust); the reasoning folds away. */
export function ResultCard({ candidate, highlight }: ResultCardProps) {
  const { product } = candidate;
  const [open, setOpen] = useState(false);
  const reasonsId = useId();
  const reasons = visibleReasons(candidate);
  const hasReasons = reasons.good.length + reasons.bad.length > 0;
  const isSideNote = candidate.match === "accessory" || candidate.suspicious;

  return (
    <article className={`card ${highlight ? "highlight" : ""}`}>
      <Thumb src={product.imageUrl} />
      <div className="cardBody">
        {highlight && (
          <span className="ribbon">
            <Award size={12} aria-hidden="true" /> {highlight}
          </span>
        )}
        <h3>{product.title}</h3>
        <div className="priceRow">
          {product.price && <b className="num">{formatMoney(product.price.amount)}</b>}
          <PriceBadge candidate={candidate} />
          {candidate.unitPrice && (
            <span className="unit num">
              {formatMoney(candidate.unitPrice.amount)}/{candidate.unitPrice.unit}
            </span>
          )}
        </div>
        <div className="meta">
          {product.seller && (
            <span title="Seller score">
              <ShieldCheck size={13} aria-hidden="true" />
              {product.seller}
              {product.sellerScore !== undefined && <b className="num">{product.sellerScore}%</b>}
            </span>
          )}
          {product.rating !== undefined && (
            <span title={product.reviewCount !== undefined ? `${product.reviewCount} reviews` : undefined}>
              <Star size={13} className="star" aria-hidden="true" />
              <span className="num">{product.rating.toFixed(1)}</span>
            </span>
          )}
          {!isSideNote && <MatchBars confidence={candidate.confidence} />}
        </div>
        {hasReasons && (
          <div className={`collapse ${open ? "open" : ""}`} id={reasonsId} aria-hidden={!open} inert={!open}>
            <div>
              <ul className="reasons">
                {reasons.good.map((reason) => (
                  <li key={reason}>
                    <Check aria-hidden="true" />
                    {reason}
                  </li>
                ))}
                {reasons.bad.map((warning) => (
                  <li className="bad" key={warning}>
                    <AlertTriangle aria-hidden="true" />
                    {warning}
                  </li>
                ))}
                <li className="score num">Match score {candidate.totalScore}/100</li>
              </ul>
            </div>
          </div>
        )}
        <div className="cardFoot">
          <OpenLink href={product.url}>Open on Jumia</OpenLink>
          {hasReasons && (
            <button
              className="whyButton"
              type="button"
              aria-expanded={open}
              aria-controls={reasonsId}
              onClick={() => setOpen(!open)}
            >
              Why this match <ChevronDown size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PriceBadge({ candidate }: { candidate: CandidateScore }) {
  if (candidate.suspicious) {
    return (
      <span className="badge warn">
        <AlertTriangle aria-hidden="true" /> Too cheap to trust
      </span>
    );
  }
  const delta = candidate.priceDelta;
  if (candidate.match === "accessory" || delta === undefined) return null;
  if (delta > 0) {
    return (
      <span className="badge save num">
        <TrendingDown aria-hidden="true" /> {formatMoney(delta)} less
      </span>
    );
  }
  if (delta === 0) return <span className="badge">Same price</span>;
  return <span className="badge warn num">{formatMoney(-delta)} more</span>;
}

function MatchBars({ confidence }: { confidence: CandidateScore["confidence"] }) {
  const { label, level } = matchLabel(confidence);
  return (
    <span className="match">
      <span className={`bars level${level}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {label}
    </span>
  );
}
