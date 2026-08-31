import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DEMO_PLANS,
  clonePlan,
  evaluateExercise,
  type BackupPlan,
  type ExerciseResult,
  type RunExerciseInput,
} from "./restore";

const DATA_FILE = path.join(process.cwd(), "data", "restore.json");

export type RestoreStore = {
  plans: BackupPlan[];
  results: ExerciseResult[];
};

function seedStore(): RestoreStore {
  return {
    plans: DEMO_PLANS.map(clonePlan),
    results: [],
  };
}

export function loadRestore(): RestoreStore {
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as RestoreStore;
    return {
      plans: Array.isArray(raw.plans) && raw.plans.length > 0
        ? raw.plans
        : DEMO_PLANS.map(clonePlan),
      results: Array.isArray(raw.results) ? raw.results : [],
    };
  } catch {
    const seeded = seedStore();
    saveRestore(seeded);
    return seeded;
  }
}

export function saveRestore(store: RestoreStore): void {
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

export function listExercises(): RestoreStore {
  return loadRestore();
}

export function runExercise(
  input: Omit<RunExerciseInput, "plan"> & { planId: string },
): ExerciseResult {
  const store = loadRestore();
  const plan = store.plans.find((p) => p.id === input.planId);
  if (!plan) throw new Error(`Unknown plan ${input.planId}`);
  const result = evaluateExercise({
    plan,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    achievedRpoMin: input.achievedRpoMin,
    achievedRtoMin: input.achievedRtoMin,
    checklist: input.checklist,
  });
  const withId = {
    ...result,
    id: `ex_${Date.now().toString(36)}_${store.results.length}`,
  } as ExerciseResult & { id: string };
  store.results.unshift(withId);
  saveRestore(store);
  return withId;
}

export function markExercise(
  id: string,
  verdict: "pass" | "fail",
): ExerciseResult {
  const store = loadRestore();
  const idx = store.results.findIndex(
    (r) => (r as ExerciseResult & { id?: string }).id === id,
  );
  if (idx < 0) throw new Error(`Unknown exercise ${id}`);
  const current = store.results[idx] as ExerciseResult & { id?: string };
  const updated: ExerciseResult & { id?: string } = {
    ...current,
    verdict,
    summary: `${current.summary}; manually marked ${verdict}`,
  };
  store.results[idx] = updated;
  saveRestore(store);
  return updated;
}
