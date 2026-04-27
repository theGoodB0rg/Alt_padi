import type { Money } from "@core/types";

export function parseMoney(input: string | null | undefined): Money | undefined {
  const raw = input?.trim();
  if (!raw) return undefined;

  const match = raw.match(/(?:₦|NGN)?\s*([0-9][0-9,\s]*(?:\.[0-9]+)?)/i);
  if (!match) return undefined;

  const amount = Number(match[1].replace(/[,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  return { amount, currency: "NGN", raw };
}
