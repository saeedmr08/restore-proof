import { describe, expect, it } from "vitest";
import {
  DEMO_PLANS,
  clonePlan,
  evaluateExercise,
  requiredItemsComplete,
  scoreboard,
  setChecklistStatus,
} from "@/lib/restore";

describe("checklist helpers", () => {
  it("tracks required completion", () => {
    let items = clonePlan(DEMO_PLANS[0]).checklist;
    expect(requiredItemsComplete(items)).toBe(false);
    for (const req of items.filter((i) => i.required)) {
      items = setChecklistStatus(items, req.id, "done");
    }
    expect(requiredItemsComplete(items)).toBe(true);
  });

  it("allows skipped required items", () => {
    let items = clonePlan(DEMO_PLANS[0]).checklist;
    for (const req of items.filter((i) => i.required)) {
      items = setChecklistStatus(items, req.id, "skipped");
    }
    expect(requiredItemsComplete(items)).toBe(true);
  });
});

describe("evaluateExercise", () => {
  it("passes when RPO/RTO met and checklist done", () => {
    const plan = clonePlan(DEMO_PLANS[0]);
    let checklist = plan.checklist;
    for (const c of checklist.filter((i) => i.required)) {
      checklist = setChecklistStatus(checklist, c.id, "done");
    }
    const result = evaluateExercise({
      plan,
      startedAt: 0,
      finishedAt: 60_000,
      achievedRpoMin: 30,
      achievedRtoMin: 90,
      checklist,
    });
    expect(result.verdict).toBe("pass");
    expect(result.rpoMet).toBe(true);
    expect(result.rtoMet).toBe(true);
  });

  it("fails when RTO breached", () => {
    const plan = clonePlan(DEMO_PLANS[0]);
    let checklist = plan.checklist;
    for (const c of checklist.filter((i) => i.required)) {
      checklist = setChecklistStatus(checklist, c.id, "done");
    }
    const result = evaluateExercise({
      plan,
      startedAt: 0,
      finishedAt: 1,
      achievedRpoMin: 10,
      achievedRtoMin: 999,
      checklist,
    });
    expect(result.verdict).toBe("fail");
    expect(result.rtoMet).toBe(false);
  });

  it("marks incomplete when checklist unfinished", () => {
    const plan = clonePlan(DEMO_PLANS[1]);
    const result = evaluateExercise({
      plan,
      startedAt: 0,
      finishedAt: 1,
      achievedRpoMin: 1,
      achievedRtoMin: 1,
      checklist: plan.checklist,
    });
    expect(result.verdict).toBe("incomplete");
  });

  it("rejects inverted timestamps", () => {
    const plan = clonePlan(DEMO_PLANS[0]);
    expect(() =>
      evaluateExercise({
        plan,
        startedAt: 10,
        finishedAt: 5,
        achievedRpoMin: 0,
        achievedRtoMin: 0,
        checklist: plan.checklist,
      }),
    ).toThrow(/finishedAt/);
  });
});

describe("scoreboard", () => {
  it("counts verdicts", () => {
    const plan = clonePlan(DEMO_PLANS[0]);
    let checklist = plan.checklist;
    for (const c of checklist.filter((i) => i.required)) {
      checklist = setChecklistStatus(checklist, c.id, "done");
    }
    const pass = evaluateExercise({
      plan,
      startedAt: 0,
      finishedAt: 1,
      achievedRpoMin: 1,
      achievedRtoMin: 1,
      checklist,
    });
    const fail = evaluateExercise({
      plan,
      startedAt: 0,
      finishedAt: 1,
      achievedRpoMin: 9999,
      achievedRtoMin: 1,
      checklist,
    });
    expect(scoreboard([pass, fail])).toEqual({
      pass: 1,
      fail: 1,
      incomplete: 0,
    });
  });
});
