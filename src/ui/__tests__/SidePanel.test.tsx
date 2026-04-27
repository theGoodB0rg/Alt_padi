import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidePanel } from "@ui/SidePanel";
import type { ProductSnapshot, SearchRun } from "@core/types";

const sourceProduct: ProductSnapshot = {
  title: "Samsung 32-inch HD TV UA32T5300",
  url: "https://www.jumia.com.ng/source.html",
  brand: "Samsung",
  categoryPath: ["Electronics", "Televisions"],
  price: { amount: 150000, currency: "NGN", raw: "₦150,000" },
  specs: { model: "UA32T5300" },
  source: "page"
};

const run: SearchRun = {
  sourceProduct,
  queries: ["Samsung UA32T5300"],
  candidates: [
    {
      product: {
        title: "Samsung 32-inch HD Smart TV UA32T5300",
        url: "https://www.jumia.com.ng/alt.html",
        brand: "Samsung",
        categoryPath: ["Electronics", "Televisions"],
        price: { amount: 132000, currency: "NGN", raw: "₦132,000" },
        rating: 4.4,
        reviewCount: 62,
        specs: { model: "UA32T5300" },
        source: "search"
      },
      totalScore: 74,
      confidence: "high",
      reasons: ["cheaper price", "same brand"],
      warnings: [],
      priceDelta: 18000,
      priceDeltaPercent: 12
    }
  ],
  errors: [],
  startedAt: "2026-04-27T08:00:00.000Z",
  completedAt: "2026-04-27T08:00:01.000Z",
  cacheHit: false
};

describe("SidePanel", () => {
  it("does not start searching before the user clicks and renders transparent results after click", async () => {
    const onFindAlternatives = vi.fn().mockResolvedValue(run);
    render(<SidePanel onFindAlternatives={onFindAlternatives} />);

    expect(screen.getByRole("heading", { name: "AltPadi" })).toBeInTheDocument();
    expect(onFindAlternatives).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /find cheaper alternatives/i }));

    await waitFor(() => expect(onFindAlternatives).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "AltPadi" })).toBeInTheDocument();
    expect(screen.getByText("Samsung 32-inch HD Smart TV UA32T5300")).toBeInTheDocument();
    expect(screen.getByText("same brand")).toBeInTheDocument();
    expect(screen.getByLabelText("Cheaper only")).toBeChecked();
  });
});
