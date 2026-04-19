"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Target, TrendingDown, Trash2, Check, X, Edit2, Droplets } from "lucide-react";
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

const STATUS_COLORS = {
  on_track: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ahead: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  at_risk: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-primary/10 text-primary",
};

const STATUS_LABELS = {
  on_track: "On Track",
  ahead: "Ahead",
  at_risk: "At Risk",
  completed: "Completed",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Daily surplus: {formatCurrency(avgDailySurplus)}/day
            {activeGoals.length > 0 && (
              <span> &middot; Goals need: {formatCurrency(totalDailyNeeded)}/day</span>
            )}
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2 self-start">
          <Plus className="h-4 w-4" /> New Goal
        </Button>
      </div>

      {/* Daily drip context card */}
      {activeGoals.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardContent className="flex flex-col items-center gap-2 py-6 sm:flex-row sm:justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(avgDailySurplus)}</p>
              <p className="text-xs text-muted-foreground">daily surplus</p>
            </div>
            <Droplets className="hidden h-6 w-6 text-primary sm:block" />
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(totalDailyNeeded)}</p>
              <p className="text-xs text-muted-foreground">needed for goals</p>
            </div>
            <Droplets className="hidden h-6 w-6 text-primary sm:block" />
            <div className="text-center">
              <p className={`text-2xl font-bold ${avgDailySurplus - totalDailyNeeded >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(avgDailySurplus - totalDailyNeeded)}
              </p>
              <p className="text-xs text-muted-foreground">remaining after goals</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Goal Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Goal Name</label>
                  <Input
                    placeholder="e.g., Emergency Fund, Car Loan"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <select
                    value={newGoal.type}
                    onChange={(e) => setNewGoal((p) => ({ ...p, type: e.target.value as "SAVE_UP" | "PAY_DOWN" }))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="SAVE_UP">Save Up (build toward target)</option>
                    <option value="PAY_DOWN">Pay Down (reduce debt to zero)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {newGoal.type === "SAVE_UP" ? "Target Amount" : "Total Debt"}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {newGoal.type === "SAVE_UP" ? "Current Savings" : "Remaining Balance"}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal((p) => ({ ...p, currentAmount: e.target.value }))}
                  />
                </div>
                {newGoal.type === "SAVE_UP" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Target Date (optional)</label>
                    <Input
                      type="date"
                      value={newGoal.targetDate}
                      onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
                    />
                  </div>
                )}
                {newGoal.type === "PAY_DOWN" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">APR % (optional)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="18.99"
                      value={newGoal.apr}
                      onChange={(e) => setNewGoal((p) => ({ ...p, apr: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Monthly Contribution</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="500"
                    value={newGoal.monthlyPayment}
                    onChange={(e) => setNewGoal((p) => ({ ...p, monthlyPayment: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit">Create Goal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {loading ? (
        <p className="text-muted-foreground">Loading goals...</p>
      ) : activeGoals.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No goals yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Set savings or debt payoff goals to see how they fit your daily drip.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
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

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-muted-foreground">Completed</h2>
          <div className="grid gap-4 md:grid-cols-2">
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
        </>
      )}
    </div>
  );
}

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

  return (
    <Card className={goal.isCompleted ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isSaveUp ? (
              <Target className="h-5 w-5 text-primary" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <div>
              <CardTitle className="text-base">{goal.name}</CardTitle>
              <CardDescription>
                {isSaveUp ? "Save Up" : "Pay Down"}
                {goal.apr > 0 && ` · ${goal.apr}% APR`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={STATUS_COLORS[goal.status]}>
              {STATUS_LABELS[goal.status]}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>{formatCurrency(isSaveUp ? goal.currentAmount : goal.targetAmount - goal.remaining)}</span>
            <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                backgroundColor: goal.color || "#4f46e5",
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{progressPct}% complete</p>
        </div>

        {/* Daily drip framing */}
        {!goal.isCompleted && goal.dailyNeeded > 0 && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm">
              <span className="font-semibold">{formatCurrency(goal.dailyNeeded)}/day</span>
              <span className="text-muted-foreground">
                {" "}needed · {formatCurrency(goal.monthlyPayment)}/month
              </span>
            </p>
            {goal.remaining > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(goal.remaining)} remaining
                {goal.daysLeft > 0 && ` · ~${goal.daysLeft} days`}
                {goal.projectedDate && (
                  <span>
                    {" "}· target: {new Date(goal.projectedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Update current amount */}
        {!goal.isCompleted && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8 w-32 text-sm"
                />
                <Button size="sm" variant="ghost" onClick={() => onUpdateAmount(parseFloat(editAmount))}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onEditToggle}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={onEditToggle} className="gap-1">
                  <Edit2 className="h-3 w-3" /> Update {isSaveUp ? "Savings" : "Balance"}
                </Button>
                <Button size="sm" variant="ghost" onClick={onToggleComplete} className="gap-1 text-green-600">
                  <Check className="h-3 w-3" /> Mark Complete
                </Button>
              </>
            )}
          </div>
        )}

        {goal.isCompleted && (
          <Button size="sm" variant="ghost" onClick={onToggleComplete} className="gap-1">
            Reopen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
