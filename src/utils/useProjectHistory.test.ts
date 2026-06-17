// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useProjectHistory } from "./useProjectHistory";
import { createProject } from "../core";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

// Tell React we are running in a test environment to support act(...)
// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT is a global flag for React tests
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("useProjectHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should initialize and perform basic undo/redo", async () => {
    const project1 = createProject({ name: "Project 1" });
    const project2 = createProject({ name: "Project 2" });

    let hook: any;
    function TestComponent() {
      hook = useProjectHistory(project1);
      return null;
    }

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(TestComponent));
    });

    expect(hook.project).toBe(project1);
    expect(hook.canUndo).toBe(false);
    expect(hook.canRedo).toBe(false);

    // Update state (discrete push by default because lastPushTime is 0)
    await act(async () => {
      hook.setProject(project2, { force: true });
    });

    expect(hook.project).toBe(project2);
    expect(hook.canUndo).toBe(true);
    expect(hook.canRedo).toBe(false);

    // Undo
    await act(async () => {
      hook.undo();
    });

    expect(hook.project).toBe(project1);
    expect(hook.canUndo).toBe(false);
    expect(hook.canRedo).toBe(true);

    // Redo
    await act(async () => {
      hook.redo();
    });

    expect(hook.project).toBe(project2);
    expect(hook.canUndo).toBe(true);
    expect(hook.canRedo).toBe(false);
  });

  it("should respect the history limit", async () => {
    const projectA = createProject({ name: "A" });
    const projectB = createProject({ name: "B" });
    const projectC = createProject({ name: "C" });
    const projectD = createProject({ name: "D" });

    let hook: any;
    function TestComponent() {
      hook = useProjectHistory(projectA, { limit: 2 });
      return null;
    }

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(TestComponent));
    });

    // We force pushes to avoid timer grouping
    await act(async () => {
      hook.setProject(projectB, { force: true });
    });
    await act(async () => {
      hook.setProject(projectC, { force: true });
    });
    await act(async () => {
      hook.setProject(projectD, { force: true });
    });

    // Limit is 2. So the past stack can hold at most 2 elements.
    // Present: D
    // Past: [B, C] (A was shifted out)
    expect(hook.project).toBe(projectD);

    await act(async () => {
      hook.undo(); // present becomes C, past is [B]
    });
    expect(hook.project).toBe(projectC);

    await act(async () => {
      hook.undo(); // present becomes B, past is []
    });
    expect(hook.project).toBe(projectB);

    expect(hook.canUndo).toBe(false);
  });

  it("should group rapid successive changes (debounce/replace)", async () => {
    const p1 = createProject({ name: "Original" });
    const p2 = createProject({ name: "Edit 1" });
    const p3 = createProject({ name: "Edit 2" });
    const p4 = createProject({ name: "Edit 3" });

    let hook: any;
    function TestComponent() {
      hook = useProjectHistory(p1, { groupingDelayMs: 1000 });
      return null;
    }

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(TestComponent));
    });

    // 1st change: force push
    await act(async () => {
      hook.setProject(p2, { force: true });
    });

    // Advance time by 500ms (less than groupingDelayMs of 1000ms)
    vi.advanceTimersByTime(500);

    // 2nd change: should replace present p2 (not push to past)
    await act(async () => {
      hook.setProject(p3);
    });

    // Present is p3, past should be [p1] because p2 was replaced
    expect(hook.project).toBe(p3);

    // Advance time by 1500ms (more than groupingDelayMs of 1000ms)
    vi.advanceTimersByTime(1500);

    // 3rd change: should push p3 to past
    await act(async () => {
      hook.setProject(p4);
    });

    // Present: p4
    // Past: [p1, p3]
    expect(hook.project).toBe(p4);

    // Undo 1: goes to p3
    await act(async () => {
      hook.undo();
    });
    expect(hook.project).toBe(p3);

    // Undo 2: goes to p1 (since p2 was replaced by p3)
    await act(async () => {
      hook.undo();
    });
    expect(hook.project).toBe(p1);
  });
});
