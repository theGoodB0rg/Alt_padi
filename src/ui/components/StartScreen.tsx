import { MousePointerClick, Pin, Search, ShieldCheck, Sparkles, Tag, TrendingDown, X } from "lucide-react";
import { formatMoney } from "@ui/model/format";
import { totalFound, type SavingsStats } from "@ui/model/savings";

interface StartScreenProps {
  onStart: () => void;
  stats: SavingsStats;
  showPinTip: boolean;
  onDismissPinTip: () => void;
}

const STEPS = [
  { icon: MousePointerClick, text: "Open any product on Jumia" },
  { icon: Search, text: "Tap Check prices" },
  { icon: TrendingDown, text: "Buy from the better deal" }
];

export function StartScreen({ onStart, stats, showPinTip, onDismissPinTip }: StartScreenProps) {
  const found = totalFound(stats);
  return (
    <>
      <section className="hero">
        <Backdrop />
        <div className="heroOrb">
          <span className="halo" aria-hidden="true" />
          <span className="halo late" aria-hidden="true" />
          <Search aria-hidden="true" />
          <span className="float one" aria-hidden="true">
            <Tag />
          </span>
          <span className="float two" aria-hidden="true">
            <TrendingDown />
          </span>
          <span className="float three" aria-hidden="true">
            <ShieldCheck />
          </span>
        </div>
        <h2>Is this the best price?</h2>
        <p>Find the same item for less, or a safer seller, without opening a dozen tabs.</p>
        <button className="button primary wide" type="button" onClick={onStart}>
          <Search size={16} aria-hidden="true" /> Check prices
        </button>
        {found > 0 && (
          <p className="savingsBadge">
            <Sparkles size={14} aria-hidden="true" />
            <b className="num">{formatMoney(found)}</b>
            <span>
              in savings found across {stats.checks} check{stats.checks === 1 ? "" : "s"}
            </span>
          </p>
        )}
      </section>

      <ol className="howItWorks" aria-label="How it works">
        {STEPS.map(({ icon: Icon, text }, index) => (
          <li key={text}>
            <span className="stepNo num">{index + 1}</span>
            <Icon size={16} aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ol>

      {showPinTip && (
        <aside className="tip pinTip">
          <Pin size={16} aria-hidden="true" />
          <p>
            <b>Pin AltPadi for one-click checks.</b> Click the puzzle icon in Chrome's toolbar, then the pin next to
            AltPadi.
          </p>
          <button className="iconButton small" type="button" aria-label="Dismiss" onClick={onDismissPinTip}>
            <X size={14} aria-hidden="true" />
          </button>
        </aside>
      )}
    </>
  );
}

/** Faint dot grid under a slow green glow: texture without noise. Purely decorative. */
function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="glow" />
      <div className="dots" />
    </div>
  );
}
