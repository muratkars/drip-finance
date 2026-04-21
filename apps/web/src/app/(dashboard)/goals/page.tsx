"use client";

import { useEffect, useState } from "react";
import { DripIcon, Drop } from "@/components/ui/drip-icons";
import {
  DripCard,
  DripButton,
  DripSelect,
  DripLabel,
  PerDay,
  Money,
  Pill,
  Liquid,
  fmtMoney,
  dripInputClass,
} from "@/components/ui/drip-primitives";
import { toast } from "sonner";

interface Goal {
  id: string;
  name: string;
  type: "SAVE_UP" | "PAY_DOWN";
  targetAmount: number;
  currentAmount: number;
  monthlyPayment: number;
  apr: number;
  targetDate: string | null;
  color: string | null;
  isCompleted: boolean;
  remaining: number;
  dailyNeeded: number;
  daysLeft: number;
  projectedDate: string | null;
  status: "on_track" | "ahead" | "at_risk" | "completed";
  progress: number;
}

const STATUS_MAP: Record<Goal["status"], { label: string; tone: "green" | "blue" | "red" | "accent" }> = {
  on_track: { label: "On Track", tone: "green" },
  ahead: { label: "Ahead", tone: "blue" },
  at_risk: { label: "At Risk", tone: "red" },
  completed: { label: "Completed", tone: "accent" },
};

const GOAL_COLORS = [
  "#4f46e5", "#0891b2", "#16a34a", "#dc2626", "#7c3aed",
  "#f59e0b", "#ec4899", "#0d9488",
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [avgDailySurplus, setAvgDailySurplus] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    name: "",
    type: "SAVE_UP" as "SAVE_UP" | "PAY_DOWN",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
    apr: "",
    monthlyPayment: "",
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    setLoading(true);
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data.goals);
    setAvgDailySurplus(data.avgDailySurplus);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newGoal,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: parseFloat(newGoal.currentAmount) || 0,
        apr: parseFloat(newGoal.apr) || null,
        monthlyPayment: parseFloat(newGoal.monthlyPayment) || null,
        targetDate: newGoal.targetDate || null,
        color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
      }),
    });
    toast.success("Goal created");
    setNewGoal({ name: "", type: "SAVE_UP", targetAmount: "", currentAmount: "", targetDate: "", apr: "", monthlyPayment: "" });
    setShowAdd(false);
    fetchGoals();
  }

  async function updateGoalAmount(id: string, currentAmount: number) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, currentAmount }),
    });
    toast.success("Goal updated");
    setEditingId(null);
    fetchGoals();
  }

  async function toggleComplete(id: string, isCompleted: boolean) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });
    fetchGoals();
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    fetchGoals();
  }

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);
  const totalDailyNeeded = activeGoals.reduce((sum, g) => sum + g.dailyNeeded, 0);
  const remaining = avgDailySurplus - totalDailyNeeded;

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div className="drip-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Goals</div>
          <h1
            className="font-display"
            style={{ fontSize: 30, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--ink)", margin: 0 }}
          >
            What are you <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>saving toward?</span>
          </h1>
        </div>
        <DripButton variant="primary" icon="plus" onClick={() => setShowAdd(!showAdd)}>
          New goal
        </DripButton>
      </div>

      {/* ── Context card ── */}
      {activeGoals.length > 0 && (
        <div
          style={{
            background: "var(--ink)",
            backgroundImage: "linear-gradient(135deg, var(--ink), var(--accent))",
            borderRadius: 14,
            padding: "28px 32px",
            marginBottom: 28,
            position: "relative",
            overflow: "hidden",
            color: "#fff",
          }}
        >
          <Drop
            size={140}
            className="absolute"
            filled
          />
          <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", opacity: 0.08 }}>
            <Drop size={140} filled />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center" }}>
              <PerDay amount={avgDailySurplus} size="md" color="#4ade80" />
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>daily surplus</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <PerDay amount={totalDailyNeeded} size="md" color="#fff" />
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>needed for goals</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <PerDay amount={remaining} size="md" color={remaining >= 0 ? "#4ade80" : "#f87171"} />
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>remaining after goals</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Goal Form ── */}
      {showAdd && (
        <DripCard style={{ marginBottom: 28 }} padding={24}>
          <h2
            className="font-display"
            style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.015em", color: "var(--ink)", margin: "0 0 20px" }}
          >
            Create a new goal
          </h2>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <DripLabel>Goal Name</DripLabel>
                <input
                  className={dripInputClass}
                  style={{ marginTop: 6 }}
                  placeholder="e.g., Emergency Fund, Car Loan"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <DripLabel>Type</DripLabel>
                <div style={{ marginTop: 6 }}>
                  <DripSelect
                    value={newGoal.type}
                    onChange={(v) => setNewGoal((p) => ({ ...p, type: v as "SAVE_UP" | "PAY_DOWN" }))}
                    options={[
                      { value: "SAVE_UP", label: "Save Up (build toward target)" },
                      { value: "PAY_DOWN", label: "Pay Down (reduce debt to zero)" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <DripLabel>{newGoal.type === "SAVE_UP" ? "Target Amount" : "Total Debt"}</DripLabel>
                <input
                  className={dripInputClass}
                  style={{ marginTop: 6 }}
                  type="number"
                  step="0.01"
                  placeholder="10000"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <DripLabel>{newGoal.type === "SAVE_UP" ? "Current Savings" : "Remaining Balance"}</DripLabel>
                <input
                  className={dripInputClass}
                  style={{ marginTop: 6 }}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={newGoal.currentAmount}
                  onChange={(e) => setNewGoal((p) => ({ ...p, currentAmount: e.target.value }))}
                />
              </div>
              {newGoal.type === "SAVE_UP" && (
                <div>
                  <DripLabel>Target Date (optional)</DripLabel>
                  <input
                    className={dripInputClass}
                    style={{ marginTop: 6 }}
                    type="date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
                  />
                </div>
              )}
              {newGoal.type === "PAY_DOWN" && (
                <div>
                  <DripLabel>APR % (optional)</DripLabel>
                  <input
                    className={dripInputClass}
                    style={{ marginTop: 6 }}
                    type="number"
                    step="0.01"
                    placeholder="18.99"
                    value={newGoal.apr}
                    onChange={(e) => setNewGoal((p) => ({ ...p, apr: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <DripLabel>Monthly Contribution</DripLabel>
                <input
                  className={dripInputClass}
                  style={{ marginTop: 6 }}
                  type="number"
                  step="0.01"
                  placeholder="500"
                  value={newGoal.monthlyPayment}
                  onChange={(e) => setNewGoal((p) => ({ ...p, monthlyPayment: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <DripButton variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</DripButton>
              <DripButton variant="primary" type="submit">Create Goal</DripButton>
            </div>
          </form>
        </DripCard>
      )}

      {/* ── Active Goals ── */}
      {loading ? (
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Loading goals...</p>
      ) : activeGoals.length === 0 && !showAdd ? (
        <DripCard padding={48} style={{ textAlign: "center" }}>
          <DripIcon name="target" size={48} style={{ color: "var(--ink-3)", margin: "0 auto 16px" }} />
          <p className="font-display" style={{ fontSize: 20, fontWeight: 400, color: "var(--ink)", margin: "0 0 4px" }}>
            No goals yet
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 20px" }}>
            Set savings or debt payoff goals to see how they fit your daily drip.
          </p>
          <DripButton variant="primary" icon="plus" onClick={() => setShowAdd(true)}>
            Create Your First Goal
          </DripButton>
        </DripCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              editing={editingId === goal.id}
              onEditToggle={() => setEditingId(editingId === goal.id ? null : goal.id)}
              onUpdateAmount={(amount) => updateGoalAmount(goal.id, amount)}
              onToggleComplete={() => toggleComplete(goal.id, goal.isCompleted)}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))}
        </div>
      )}

      {/* ── Completed Goals ── */}
      {completedGoals.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div className="drip-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 14 }}>Completed</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                editing={false}
                onEditToggle={() => {}}
                onUpdateAmount={() => {}}
                onToggleComplete={() => toggleComplete(goal.id, goal.isCompleted)}
                onDelete={() => deleteGoal(goal.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Goal Card ─── */

function GoalCard({
  goal,
  editing,
  onEditToggle,
  onUpdateAmount,
  onToggleComplete,
  onDelete,
}: {
  goal: Goal;
  editing: boolean;
  onEditToggle: () => void;
  onUpdateAmount: (amount: number) => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const [editAmount, setEditAmount] = useState(String(goal.currentAmount));
  const isSaveUp = goal.type === "SAVE_UP";
  const progressPct = Math.min(100, Math.max(0, goal.progress));
  const status = STATUS_MAP[goal.status];
  const barColor = isSaveUp ? "var(--accent)" : "#C45B7A";

  return (
    <DripCard padding={0} style={{ opacity: goal.isCompleted ? 0.6 : 1 }}>
      {/* ── Top section ── */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isSaveUp ? "rgba(63,76,217,0.10)" : "rgba(196,91,122,0.10)",
                color: isSaveUp ? "var(--accent)" : "#C45B7A",
              }}
            >
              <DripIcon name={isSaveUp ? "target" : "trenddown"} size={18} />
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.015em", color: "var(--ink)", lineHeight: 1.2 }}>
                {goal.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                {isSaveUp ? "Save Up" : "Pay Down"}
                {goal.apr > 0 && ` · ${goal.apr}% APR`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Pill tone={status.tone}>{status.label}</Pill>
            <DripButton variant="danger" size="sm" icon="trash" onClick={onDelete} style={{ border: "none", padding: 4, height: "auto", minWidth: 0 }} />
          </div>
        </div>

        {/* ── Amount display ── */}
        <div style={{ marginBottom: 10 }}>
          <Money amount={isSaveUp ? goal.currentAmount : goal.targetAmount - goal.remaining} size="xl" />
          <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 6 }}>
            of {fmtMoney(goal.targetAmount)}
          </span>
        </div>

        {/* ── Liquid progress ── */}
        <div style={{ marginBottom: 4 }}>
          <Liquid pct={progressPct} color={barColor} height={6} />
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{progressPct}% complete</div>
        </div>
      </div>

      {/* ── Daily drip framing box ── */}
      {!goal.isCompleted && goal.dailyNeeded > 0 && (
        <div
          style={{
            margin: "12px 12px 0",
            padding: "12px 14px",
            background: "var(--bg-2)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Drop size={14} filled />
            <PerDay amount={goal.dailyNeeded} size="sm" />
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              · {fmtMoney(goal.monthlyPayment)}/mo
            </span>
          </div>
          {goal.remaining > 0 && (
            <div style={{ fontSize: 11, color: "var(--ink-3)", paddingLeft: 22 }}>
              {fmtMoney(goal.remaining)} remaining
              {goal.daysLeft > 0 && ` · ~${goal.daysLeft} days`}
              {goal.projectedDate && (
                <span>
                  {" "}· target: {new Date(goal.projectedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ padding: "12px 12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        {!goal.isCompleted && (
          <>
            {editing ? (
              <>
                <input
                  className={dripInputClass}
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  style={{ width: 120, height: 30 }}
                />
                <DripButton variant="ghost" size="sm" icon="check" onClick={() => onUpdateAmount(parseFloat(editAmount))} />
                <DripButton variant="ghost" size="sm" icon="x" onClick={onEditToggle} />
              </>
            ) : (
              <>
                <DripButton variant="outline" size="sm" onClick={onEditToggle}>
                  Update {isSaveUp ? "savings" : "balance"}
                </DripButton>
                <DripButton variant="ghost" size="sm" icon="check" onClick={onToggleComplete} style={{ color: "var(--accent)" }}>
                  Mark complete
                </DripButton>
              </>
            )}
          </>
        )}
        {goal.isCompleted && (
          <DripButton variant="ghost" size="sm" onClick={onToggleComplete}>
            Reopen
          </DripButton>
        )}
      </div>
    </DripCard>
  );
}
