import { useSyncExternalStore } from "react";

/**
 * A tiny cross-component store: the score dock publishes the live total,
 * the hero's band scale reads it and draws the vermilion needle.
 * Keeping it out of React state avoids lifting the whole draft record up.
 */
export interface ScoreMark {
  total: number;
  max: number;
}

let current: ScoreMark | null = null;
const listeners = new Set<() => void>();

export function setScoreMark(next: ScoreMark | null): void {
  if (
    current === next ||
    (current &&
      next &&
      current.total === next.total &&
      current.max === next.max)
  ) {
    return;
  }
  current = next;
  for (const listener of listeners) listener();
}

export function useScoreMark(): ScoreMark | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => null,
  );
}
