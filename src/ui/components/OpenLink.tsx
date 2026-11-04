import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function OpenLink({ href, children, className = "link" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}
