import { useState, useCallback, useRef } from "react";
import type { Project } from "../core";

export type SetProjectOptions = {
  // Force pushing to history even within the grouping window
  force?: boolean;
};

export type UseProjectHistoryOptions = {
  limit?: number;
  groupingDelayMs?: number;
};

type HistoryState = {
  past: Project[];
  present: Project | null;
  future: Project[];
};

export function useProjectHistory(
  initialProject: Project | null,
  options: UseProjectHistoryOptions = {},
) {
  const limit = options.limit ?? 50;
  const groupingDelayMs = options.groupingDelayMs ?? 1000;

  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: initialProject,
    future: [],
  }));

  // Ref for grouping/debounce: tracks the last time we pushed a new history entry
  const lastPushTimeRef = useRef<number>(0);

  const setProject = useCallback(
    (
      nextProject: Project | null | ((prev: Project | null) => Project | null),
      setOptions?: SetProjectOptions,
    ) => {
      setHistory((prev) => {
        const resolved =
          typeof nextProject === "function"
            ? nextProject(prev.present)
            : nextProject;

        // Exiting the editor: reset everything
        if (resolved === null) {
          lastPushTimeRef.current = 0;
          return { past: [], present: null, future: [] };
        }

        // Opening a project from null: reset history, no undo entry
        if (prev.present === null) {
          lastPushTimeRef.current = 0;
          return { past: [], present: resolved, future: [] };
        }

        // No actual change: bail out early to prevent unnecessary re-renders
        if (JSON.stringify(prev.present) === JSON.stringify(resolved)) {
          return prev;
        }

        const now = Date.now();
        const timeDiff = now - lastPushTimeRef.current;
        const isGrouped =
          !setOptions?.force && timeDiff < groupingDelayMs && prev.past.length > 0;

        if (isGrouped) {
          // Group with previous action: replace present without pushing to past
          // The future is cleared because we've diverged from the redo path
          return {
            past: prev.past,
            present: resolved,
            future: [],
          };
        }

        // Discrete action: push current present onto past
        lastPushTimeRef.current = now;
        const newPast = [...prev.past, prev.present];
        if (newPast.length > limit) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: resolved,
          future: [],
        };
      });
    },
    [limit, groupingDelayMs],
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0 || prev.present === null) return prev;

      const newPast = prev.past.slice(0, -1);
      const previousPresent = prev.past[prev.past.length - 1]!;
      const newFuture = [prev.present, ...prev.future];

      // Reset grouping timer so the next change after undo is always a discrete push
      lastPushTimeRef.current = 0;

      return {
        past: newPast,
        present: previousPresent,
        future: newFuture,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0 || prev.present === null) return prev;

      const [nextPresent, ...newFuture] = prev.future;
      const newPast = [...prev.past, prev.present];

      // Reset grouping timer so the next change after redo is always a discrete push
      lastPushTimeRef.current = 0;

      return {
        past: newPast,
        present: nextPresent!,
        future: newFuture,
      };
    });
  }, []);

  return {
    project: history.present,
    setProject,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
