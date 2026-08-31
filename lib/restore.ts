/**
 * RestoreProof — synthetic disaster-recovery exercise scoring.
 * Plans/results persist via lib/store.ts (data/restore.json) and the API.
 */

export type ChecklistItemStatus = "pending" | "done" | "skipped" | "blocked";

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  status: ChecklistItemStatus;
  notes?: string;
}

export interface BackupPlan {
  id: string;
  name: string;
  system: string;
  /** Recovery Point Objective in minutes */
  rpoTargetMin: number;
  /** Recovery Time Objective in minutes */
  rtoTargetMin: number;
  checklist: ChecklistItem[];
}

export type ExerciseVerdict = "pass" | "fail" | "incomplete";

export interface ExerciseResult {
  /** Optional persisted id when stored via API */
  id?: string;
  planId: string;
  startedAt: number;
  finishedAt: number;
  /** Measured data loss window in minutes (synthetic) */
  achievedRpoMin: number;
  /** Measured restore duration in minutes (synthetic) */
  achievedRtoMin: number;
  checklist: ChecklistItem[];
  rpoMet: boolean;
  rtoMet: boolean;
  requiredComplete: boolean;
  verdict: ExerciseVerdict;
  summary: string;
}

export interface RunExerciseInput {
  plan: BackupPlan;
  startedAt: number;
  finishedAt: number;
  achievedRpoMin: number;
  achievedRtoMin: number;
  checklist: ChecklistItem[];
}

export const DEMO_PLANS: BackupPlan[] = [
  {
    id: "plan-ledger",
    name: "Ledger DB nightly",
    system: "synth-ledger-pg",
    rpoTargetMin: 60,
    rtoTargetMin: 120,
    checklist: [
      { id: "c1", label: "Confirm last successful snapshot id", required: true, status: "pending" },
      { id: "c2", label: "Restore into isolated sandbox", required: true, status: "pending" },
      { id: "c3", label: "Run row-count smoke checks", required: true, status: "pending" },
      { id: "c4", label: "Capture restore timeline notes", required: false, status: "pending" },
    ],
  },
  {
    id: "plan-object",
    name: "Object store weekly",
    system: "synth-blob-cold",
    rpoTargetMin: 1440,
    rtoTargetMin: 240,
    checklist: [
      { id: "o1", label: "Locate cold vault manifest", required: true, status: "pending" },
      { id: "o2", label: "Hydrate sample prefix to scratch bucket", required: true, status: "pending" },
      { id: "o3", label: "Verify checksum sample set", required: true, status: "pending" },
      { id: "o4", label: "Document egress cost estimate", required: false, status: "pending" },
    ],
  },
  {
    id: "plan-config",
    name: "Config & secrets vault",
    system: "synth-config-vault",
    rpoTargetMin: 15,
    rtoTargetMin: 45,
    checklist: [
      { id: "v1", label: "Export sealed config bundle (demo)", required: true, status: "pending" },
      { id: "v2", label: "Rotate demo unwrap key", required: true, status: "pending" },
      { id: "v3", label: "Apply to staging replica", required: true, status: "pending" },
      { id: "v4", label: "Validate service boot probes", required: true, status: "pending" },
    ],
  },
];

export function clonePlan(plan: BackupPlan): BackupPlan {
  return {
    ...plan,
    checklist: plan.checklist.map((c) => ({ ...c })),
  };
}

export function setChecklistStatus(
  items: ChecklistItem[],
  id: string,
  status: ChecklistItemStatus,
  notes?: string,
): ChecklistItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, status, notes: notes ?? item.notes }
      : { ...item },
  );
}

export function requiredItemsComplete(items: ChecklistItem[]): boolean {
  return items
    .filter((i) => i.required)
    .every((i) => i.status === "done" || i.status === "skipped");
}

export function evaluateExercise(input: RunExerciseInput): ExerciseResult {
  if (input.finishedAt < input.startedAt) {
    throw new Error("finishedAt must be >= startedAt");
  }
  if (input.achievedRpoMin < 0 || input.achievedRtoMin < 0) {
    throw new Error("RPO/RTO measurements must be non-negative");
  }

  const checklist = input.checklist.map((c) => ({ ...c }));
  const rpoMet = input.achievedRpoMin <= input.plan.rpoTargetMin;
  const rtoMet = input.achievedRtoMin <= input.plan.rtoTargetMin;
  const requiredComplete = requiredItemsComplete(checklist);

  let verdict: ExerciseVerdict;
  if (!requiredComplete) {
    verdict = "incomplete";
  } else if (rpoMet && rtoMet) {
    verdict = "pass";
  } else {
    verdict = "fail";
  }

  const parts: string[] = [];
  parts.push(
    rpoMet
      ? `RPO met (${input.achievedRpoMin}m ≤ ${input.plan.rpoTargetMin}m)`
      : `RPO missed (${input.achievedRpoMin}m > ${input.plan.rpoTargetMin}m)`,
  );
  parts.push(
    rtoMet
      ? `RTO met (${input.achievedRtoMin}m ≤ ${input.plan.rtoTargetMin}m)`
      : `RTO missed (${input.achievedRtoMin}m > ${input.plan.rtoTargetMin}m)`,
  );
  if (!requiredComplete) parts.push("required checklist incomplete");

  return {
    planId: input.plan.id,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    achievedRpoMin: input.achievedRpoMin,
    achievedRtoMin: input.achievedRtoMin,
    checklist,
    rpoMet,
    rtoMet,
    requiredComplete,
    verdict,
    summary: parts.join("; "),
  };
}

export function scoreboard(results: ExerciseResult[]): {
  pass: number;
  fail: number;
  incomplete: number;
} {
  const out = { pass: 0, fail: 0, incomplete: 0 };
  for (const r of results) out[r.verdict] += 1;
  return out;
}
