import { NextResponse } from "next/server";
import type { ChecklistItem } from "@/lib/restore";
import { listExercises, runExercise } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const store = listExercises();
  return NextResponse.json(store);
}

export async function POST(request: Request) {
  let body: {
    planId?: string;
    achievedRpoMin?: number;
    achievedRtoMin?: number;
    checklist?: ChecklistItem[];
    startedAt?: number;
    finishedAt?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.planId || !body.checklist) {
    return NextResponse.json(
      { error: "planId and checklist are required" },
      { status: 400 },
    );
  }
  if (
    typeof body.achievedRpoMin !== "number" ||
    typeof body.achievedRtoMin !== "number"
  ) {
    return NextResponse.json(
      { error: "achievedRpoMin and achievedRtoMin are required" },
      { status: 400 },
    );
  }

  try {
    const now = Date.now();
    const result = runExercise({
      planId: body.planId,
      startedAt: body.startedAt ?? now - body.achievedRtoMin * 60_000,
      finishedAt: body.finishedAt ?? now,
      achievedRpoMin: body.achievedRpoMin,
      achievedRtoMin: body.achievedRtoMin,
      checklist: body.checklist,
    });
    const store = listExercises();
    return NextResponse.json({ result, ...store }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Exercise failed" },
      { status: 400 },
    );
  }
}
