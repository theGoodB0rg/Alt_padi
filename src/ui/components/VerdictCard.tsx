import { ArrowRight, CircleCheck, ShieldCheck, TrendingDown } from "lucide-react";
import type { SearchRun } from "@core/types";
import { formatMoney } from "@ui/model/format";
import { buildVerdict } from "@ui/model/verdict";
import { useCountUp } from "@ui/hooks/useCountUp";
import { OpenLink } from "@ui/components/OpenLink";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function VerdictCard({ run }: { run: SearchRun }) {
  const verdict = buildVerdict(run);
  if (!verdict) return null;

  if (verdict.kind === "save") {
    const { cheapest, saving, sellerCount, sourcePrice } = verdict;
    return (
      <section className="verdict save" aria-label="Verdict">
        <span className="tag">
          <TrendingDown size={14} aria-hidden="true" /> Same item, lower price
        </span>
        <Saving amount={saving} />
        <p>Cheapest of {plural(sellerCount, "seller")} with this exact item.</p>
        <div className="compare">
          <div className="was">
            <span>You're viewing</span>
            <b className="num">{formatMoney(sourcePrice)}</b>
          </div>
          <ArrowRight size={16} aria-hidden="true" />
          <div className="now">
            <span>{cheapest.product.seller ?? "Another seller"}</span>
            <b className="num">{formatMoney(cheapest.product.price!.amount)}</b>
          </div>
        </div>
        <OpenLink href={cheapest.product.url} className="button primary wide">
          Open cheapest
        </OpenLink>
      </section>
    );
  }

  if (verdict.kind === "unique") {
    return (
      <section className="verdict" aria-label="Verdict">
        <span className="tag">
          <CircleCheck size={14} aria-hidden="true" /> Only listing
        </span>
        <p className="headline">No other seller has this exact item</p>
        <p>Similar items are below, if you want to compare.</p>
      </section>
    );
  }

  const { saferSeller } = verdict;
  return (
    <>
      <section className="verdict" aria-label="Verdict">
        <span className="tag">
          <CircleCheck size={14} aria-hidden="true" /> Good news
        </span>
        <p className="headline">You already have the lowest price</p>
        <p>We compared {plural(verdict.sellerCount, "other seller")} of this exact item. None sell it for less.</p>
      </section>
      {saferSeller && (
        <aside className="tip">
          <ShieldCheck size={16} aria-hidden="true" />
          <p>
            <b>Safer seller, same price:</b> {saferSeller.product.seller} has a{" "}
            <b className="num">{saferSeller.product.sellerScore}%</b> seller score (yours:{" "}
            {run.sourceProduct.sellerScore}%). <OpenLink href={saferSeller.product.url}>Open</OpenLink>
          </p>
        </aside>
      )}
    </>
  );
}

function Saving({ amount }: { amount: number }) {
  const shown = useCountUp(amount);
  return <p className="saving num">{`Save ${formatMoney(shown)}`}</p>;
}
