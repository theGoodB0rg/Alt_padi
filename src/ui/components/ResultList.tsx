import { AlertTriangle, ChevronDown, Layers, Lightbulb, Plug, Store, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { CandidateGroups } from "@ui/model/results";
import { ResultCard } from "@ui/components/ResultCard";

interface Section {
  key: keyof CandidateGroups;
  icon: LucideIcon;
  title: string;
  /** Side notes start folded and explain themselves in one line. */
  foldedHint?: string;
}

const SECTIONS: Section[] = [
  { key: "sameItem", icon: Store, title: "Same item, other sellers" },
  { key: "variant", icon: Layers, title: "Other sizes & versions" },
  { key: "alternative", icon: Lightbulb, title: "Similar items" },
  { key: "accessory", icon: Plug, title: "Accessories & parts", foldedHint: "Made for this item, not the item itself" },
  { key: "suspicious", icon: AlertTriangle, title: "Hidden: looks too cheap", foldedHint: "Often a fake, a part, or a bait listing" }
];

export function ResultList({ groups, cheapestUrl }: { groups: CandidateGroups; cheapestUrl?: string }) {
  return (
    <>
      {SECTIONS.map((section) => {
        const items = groups[section.key];
        if (!items.length) return null;
        const cards = items.map((candidate) => (
          <ResultCard
            key={candidate.product.url}
            candidate={candidate}
            highlight={candidate.product.url === cheapestUrl ? "Cheapest exact match" : undefined}
          />
        ));
        const Icon = section.icon;
        const heading = (
          <>
            <Icon size={15} aria-hidden="true" />
            <span className="groupTitle">
              <b>
                {section.title} <span className="count num">{items.length}</span>
              </b>
              {section.foldedHint && <small>{section.foldedHint}</small>}
            </span>
          </>
        );
        return section.foldedHint ? (
          <Fold key={section.key} className={section.key} heading={heading}>
            {cards}
          </Fold>
        ) : (
          <section className="group" key={section.key} aria-label={section.title}>
            <h2 className="groupHead">{heading}</h2>
            {cards}
          </section>
        );
      })}
    </>
  );
}

function Fold({ className, heading, children }: { className: string; heading: ReactNode; children: ReactNode }) {
  return (
    <details className={`fold ${className}`}>
      <summary>
        {heading}
        <ChevronDown className="chevron" size={15} aria-hidden="true" />
      </summary>
      <div className="foldBody">{children}</div>
    </details>
  );
}
