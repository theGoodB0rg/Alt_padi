import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  tone?: "neutral" | "danger";
  children?: ReactNode;
}

/** Icon, one heading, one sentence, one next step. Used for the start screen and every error. */
export function EmptyState({ icon: Icon, title, body, tone = "neutral", children }: EmptyStateProps) {
  return (
    <section className={`emptyState ${tone}`}>
      <div className="orb">
        <Icon aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </section>
  );
}
