"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type BackupPlan,
  type ChecklistItem,
  type ExerciseResult,
  clonePlan,
  scoreboard,
  setChecklistStatus,
} from "@/lib/restore";
import styles from "./page.module.css";

type Draft = {
  plan: BackupPlan;
  checklist: ChecklistItem[];
  achievedRpoMin: number;
  achievedRtoMin: number;
};

function draftFrom(plan: BackupPlan): Draft {
  const p = clonePlan(plan);
  return {
    plan: p,
    checklist: p.checklist,
    achievedRpoMin: Math.round(p.rpoTargetMin * 0.5),
    achievedRtoMin: Math.round(p.rtoTargetMin * 0.7),
  };
}

export default function HomePage() {
  const [plans, setPlans] = useState<BackupPlan[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [history, setHistory] = useState<ExerciseResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const board = useMemo(() => scoreboard(history), [history]);
  const inProgress = useMemo(
    () => history.filter((r) => r.verdict === "incomplete"),
    [history],
  );
  const completed = useMemo(
    () => history.filter((r) => r.verdict === "pass" || r.verdict === "fail"),
    [history],
  );

  const applyStore = (data: {
    plans?: BackupPlan[];
    results?: ExerciseResult[];
  }) => {
    if (data.plans) setPlans(data.plans);
    if (data.results) setHistory(data.results);
  };

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/exercises");
      if (!res.ok) {
        setError("Failed to load exercises");
        return;
      }
      const data = (await res.json()) as {
        plans: BackupPlan[];
        results: ExerciseResult[];
      };
      applyStore(data);
      setSelectedId((prev) => {
        const id = prev || data.plans[0]?.id || "";
        const plan = data.plans.find((p) => p.id === id) ?? data.plans[0];
        if (plan) setDraft(draftFrom(plan));
        return plan?.id ?? "";
      });
    } catch {
      setError("Network error loading exercises");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectPlan = (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    setSelectedId(id);
    setDraft(draftFrom(plan));
  };

  const toggleItem = (id: string) => {
    setDraft((d) => {
      if (!d) return d;
      const cur = d.checklist.find((c) => c.id === id)!;
      const next =
        cur.status === "done"
          ? "pending"
          : cur.status === "pending"
            ? "done"
            : "done";
      return {
        ...d,
        checklist: setChecklistStatus(d.checklist, id, next),
      };
    });
  };

  const run = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: draft.plan.id,
          achievedRpoMin: draft.achievedRpoMin,
          achievedRtoMin: draft.achievedRtoMin,
          checklist: draft.checklist,
        }),
      });
      const data = (await res.json()) as {
        results?: ExerciseResult[];
        plans?: BackupPlan[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Exercise failed");
        return;
      }
      applyStore(data);
    } finally {
      setBusy(false);
    }
  };

  const mark = async (id: string, verdict: "pass" | "fail") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/exercises/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict }),
      });
      const data = (await res.json()) as {
        results?: ExerciseResult[];
        plans?: BackupPlan[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Mark failed");
        return;
      }
      applyStore(data);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.shell}>
        <p className={styles.empty}>Loading restore plans…</p>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className={styles.shell}>
        <p className={styles.empty}>
          No backup plans available — seed data failed to load.
        </p>
        {error ? <p className={styles.empty}>{error}</p> : null}
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.hero}>
        <p className={styles.kicker}>SYNTHETIC DR RANGE · PERSISTED</p>
        <h1>RestoreProof</h1>
        <p className={styles.lede}>
          Rehearse backup plans without touching production. Score RPO/RTO
          against targets and prove the checklist closed. Results save to
          data/restore.json.
        </p>
      </header>

      {error ? (
        <p className={styles.empty} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.score}>
        <div data-v="pass">
          <span>Pass</span>
          <strong>{board.pass}</strong>
        </div>
        <div data-v="fail">
          <span>Fail</span>
          <strong>{board.fail}</strong>
        </div>
        <div data-v="incomplete">
          <span>Incomplete</span>
          <strong>{board.incomplete}</strong>
        </div>
      </section>

      <div className={styles.grid}>
        <aside className={styles.plans}>
          <h2>Backup plans</h2>
          {plans.length === 0 ? (
            <p className={styles.empty}>No plans seeded yet.</p>
          ) : (
            <ul>
              {plans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={selectedId === p.id ? styles.active : undefined}
                    onClick={() => selectPlan(p.id)}
                  >
                    <strong>{p.name}</strong>
                    <span>{p.system}</span>
                    <em>
                      RPO {p.rpoTargetMin}m · RTO {p.rtoTargetMin}m
                    </em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={styles.exercise}>
          <h2>Exercise desk</h2>
          <div className={styles.targets}>
            <label>
              Achieved RPO (min)
              <input
                type="number"
                min={0}
                value={draft.achievedRpoMin}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? { ...d, achievedRpoMin: Number(e.target.value) }
                      : d,
                  )
                }
              />
            </label>
            <label>
              Achieved RTO (min)
              <input
                type="number"
                min={0}
                value={draft.achievedRtoMin}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? { ...d, achievedRtoMin: Number(e.target.value) }
                      : d,
                  )
                }
              />
            </label>
          </div>

          <ul className={styles.check}>
            {draft.checklist.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  data-status={item.status}
                >
                  <span>{item.status === "done" ? "☑" : "☐"}</span>
                  <div>
                    <strong>
                      {item.label}
                      {item.required ? "" : " (optional)"}
                    </strong>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={styles.run}
            disabled={busy}
            onClick={() => void run()}
          >
            Start exercise
          </button>
        </section>

        <section className={styles.history}>
          <h2>Results</h2>
          {history.length === 0 ? (
            <p className={styles.empty}>
              No exercises yet — complete the checklist and start an exercise.
            </p>
          ) : (
            <>
              <h3 className={styles.sectionLabel}>In progress</h3>
              {inProgress.length === 0 ? (
                <p className={styles.empty}>No incomplete exercises.</p>
              ) : (
                <ul>
                  {inProgress.map((r, i) => (
                    <ResultRow
                      key={`${r.id ?? r.planId}-ip-${i}`}
                      r={r}
                      busy={busy}
                      onMark={mark}
                    />
                  ))}
                </ul>
              )}
              <h3 className={styles.sectionLabel}>Completed</h3>
              {completed.length === 0 ? (
                <p className={styles.empty}>
                  No pass/fail results yet — mark incomplete runs or meet RPO/RTO.
                </p>
              ) : (
                <ul>
                  {completed.map((r, i) => (
                    <ResultRow
                      key={`${r.id ?? r.planId}-done-${i}`}
                      r={r}
                      busy={busy}
                      onMark={mark}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      <footer className={styles.foot}>
        Saeed Rumaneh · RestoreProof · /api/exercises · demo data only
      </footer>
    </main>
  );
}

function ResultRow({
  r,
  busy,
  onMark,
}: {
  r: ExerciseResult;
  busy: boolean;
  onMark: (id: string, verdict: "pass" | "fail") => Promise<void>;
}) {
  return (
    <li data-verdict={r.verdict}>
      <strong>{r.verdict.toUpperCase()}</strong>
      <span>{r.planId}</span>
      <p>{r.summary}</p>
      {r.id ? (
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onMark(r.id!, "pass")}
          >
            Mark pass
          </button>{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onMark(r.id!, "fail")}
          >
            Mark fail
          </button>
        </div>
      ) : null}
    </li>
  );
}
