import { NextResponse } from "next/server";
import { listExercises, markExercise } from "@/lib/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: { verdict?: "pass" | "fail" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.verdict !== "pass" && body.verdict !== "fail") {
    return NextResponse.json(
      { error: "verdict must be pass or fail" },
      { status: 400 },
    );
  }
  try {
    const result = markExercise(id, body.verdict);
    const store = listExercises();
    return NextResponse.json({ result, ...store });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mark failed" },
      { status: 404 },
    );
  }
}
