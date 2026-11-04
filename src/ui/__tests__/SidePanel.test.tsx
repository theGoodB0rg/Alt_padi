import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidePanel, type FindAlternatives } from "@ui/SidePanel";
import type { SearchProgress, SearchRun } from "@core/types";
import { makeCandidate, makeProduct, makeRun } from "@test/fixtures";
import { EMPTY_STATS, type SavingsStats, type SavingsStore } from "@ui/model/savings";

function memoryStore(initial: SavingsStats = EMPTY_STATS) {
  let stats = initial;
  return {
    load: vi.fn(async () => stats),
    save: vi.fn(async (next: SavingsStats) => {
      stats = next;
    }),
    get current() {
      return stats;
    }
  } satisfies SavingsStore & { current: SavingsStats };
}

const cheaper = makeCandidate({
  product: { title: "Samsung 32-inch HD Smart TV UA32T5300", price: 132000, seller: "Samsung Official", sellerScore: 98 },
  reasons: ["cheaper price", "same brand"]
});
const dearer = makeCandidate({ match: "alternative", product: { title: "LG 32-inch HD TV", price: 170000 } });
const run = makeRun([cheaper, dearer]);

/** A search the test resolves by hand, so in-flight states can be checked. */
function deferredSearch() {
  let resolve!: (run: SearchRun) => void;
  let reject!: (error: Error) => void;
  let report!: (progress: SearchProgress) => void;
  const search = vi.fn<FindAlternatives>((onProgress) => {
    report = onProgress;
    return new Promise<SearchRun>((res, rej) => {
      resolve = res;
      reject = rej;
    });
  });
  return { search, resolve: (r: SearchRun) => act(async () => resolve(r)), reject: (e: Error) => act(async () => reject(e)), report: (p: SearchProgress) => act(() => report(p)) };
}

const checkPrices = () => fireEvent.click(screen.getByRole("button", { name: /check prices/i }));

describe("SidePanel", () => {
  it("waits for the user, shows progress, then leads with the saving", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);

    expect(screen.getByRole("heading", { name: "AltPadi" })).toBeInTheDocument();
    expect(pending.search).not.toHaveBeenCalled();

    checkPrices();
    const progress = screen.getByRole("status", { name: /search progress/i });
    expect(within(progress).getByText("Reading this product")).toBeInTheDocument();

    pending.report({ stage: "searching", done: 1, total: 3 });
    expect(within(progress).getByText("1 of 3")).toBeInTheDocument();

    await pending.resolve(run);

    expect(screen.queryByRole("status", { name: /search progress/i })).not.toBeInTheDocument();
    expect(screen.getByText("Save ₦18,000")).toBeInTheDocument();
    expect(screen.getByText("Samsung 32-inch HD Smart TV UA32T5300")).toBeInTheDocument();
    expect(screen.queryByText("LG 32-inch HD TV")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cheaper only" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lets the user stop a search and ignores its late result", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);

    checkPrices();
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await pending.resolve(run);

    expect(screen.queryByText(/save/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check prices/i })).toBeEnabled();
  });

  it("explains a wrong page in plain words and lets the user retry", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);

    checkPrices();
    await pending.reject(new Error("Open a Jumia Nigeria product page before searching."));

    expect(screen.getByRole("heading", { name: "Open a Jumia product" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(pending.search).toHaveBeenCalledTimes(2);
  });

  it("updates results straight away when a filter chip is tapped", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);
    checkPrices();
    await pending.resolve(run);

    fireEvent.click(screen.getByRole("button", { name: "Cheaper only" }));
    expect(screen.getByText("LG 32-inch HD TV")).toBeInTheDocument();
  });

  it("offers to clear filters when nothing is left", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);
    checkPrices();
    await pending.resolve(makeRun([dearer]));

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(screen.getByText("LG 32-inch HD TV")).toBeInTheDocument();
  });

  it("keeps reasons tucked away until asked", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);
    checkPrices();
    await pending.resolve(run);

    const why = screen.getByRole("button", { name: /why this match/i });
    expect(why).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(why);
    expect(why).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("same brand")).toBeVisible();
    expect(screen.queryByText("cheaper price")).not.toBeInTheDocument();
  });

  it("says so when the user already has the lowest price", async () => {
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} />);
    checkPrices();
    await pending.resolve(makeRun([makeCandidate({ product: { price: 160000 } })], makeProduct()));

    expect(screen.getByText("You already have the lowest price")).toBeInTheDocument();
  });

  describe("start screen", () => {
    it("explains how it works in three steps", () => {
      render(<SidePanel onFindAlternatives={vi.fn()} />);
      const steps = screen.getByRole("list", { name: /how it works/i });
      expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    });

    it("shows savings found so far, once there are any", async () => {
      const store = memoryStore({ checks: 6, found: { a: 30000, b: 17500 } });
      render(<SidePanel onFindAlternatives={vi.fn()} savings={store} />);
      expect(await screen.findByText("₦47,500")).toBeInTheDocument();
      expect(screen.getByText(/found across 6 checks/i)).toBeInTheDocument();
    });

    it("stays quiet about savings for a new user", async () => {
      const store = memoryStore();
      render(<SidePanel onFindAlternatives={vi.fn()} savings={store} />);
      await waitFor(() => expect(store.load).toHaveBeenCalled());
      expect(screen.queryByText(/savings found/i)).not.toBeInTheDocument();
    });

    it("suggests pinning only when AltPadi is not on the toolbar, and can be dismissed", async () => {
      const { unmount } = render(<SidePanel onFindAlternatives={vi.fn()} isPinned={async () => true} />);
      await act(async () => {});
      expect(screen.queryByText(/pin altpadi/i)).not.toBeInTheDocument();
      unmount();

      render(<SidePanel onFindAlternatives={vi.fn()} isPinned={async () => false} />);
      expect(await screen.findByText(/pin altpadi/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
      expect(screen.queryByText(/pin altpadi/i)).not.toBeInTheDocument();
    });
  });

  it("records what a finished search found", async () => {
    const store = memoryStore();
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} savings={store} />);
    checkPrices();
    await pending.resolve(run);

    await waitFor(() => expect(store.current).toEqual({ checks: 1, found: { [run.sourceProduct.url]: 18000 } }));
  });

  it("does not record a search the user stopped", async () => {
    const store = memoryStore();
    const pending = deferredSearch();
    render(<SidePanel onFindAlternatives={pending.search} savings={store} />);
    checkPrices();
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await pending.resolve(run);

    expect(store.save).not.toHaveBeenCalled();
  });
});
