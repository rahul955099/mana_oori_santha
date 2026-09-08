import { useEffect, useState } from "react";

/**
 * Rotates through `terms` as `Search for "<term>"`, pausing while `paused` is
 * true (pass in something like `value.length > 0` so it stops as soon as the
 * user starts typing) and resuming automatically once unpaused.
 */
export function useRotatingPlaceholder(terms: string[], paused: boolean, intervalMs = 2200): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || terms.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % terms.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [paused, terms, intervalMs]);

  if (terms.length === 0) return "Search...";
  return `Search for "${terms[index % terms.length]}"`;
}
