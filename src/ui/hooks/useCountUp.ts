import { useEffect, useState } from "react";

const prefersMotion = () =>
  typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number up from zero. Shows the final value at once when motion is reduced or unsupported. */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (prefersMotion() ? 0 : target));

  useEffect(() => {
    if (!prefersMotion()) {
      setValue(target);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setValue(target * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
