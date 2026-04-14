"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Zap } from "lucide-react";

interface Rule {
  id: string;
  pattern: string;
  matchType: string;
  priority: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface RulesManagerProps {
  categories: Category[];
}

export function RulesManager({ categories }: RulesManagerProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({
    pattern: "",
    matchType: "CONTAINS",
    categoryId: "",
    applyRetroactively: false,
  });
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    const res = await fetch("/api/rules");
    setRules(await res.json());
  }

  async function addRule() {
    if (!newRule.pattern || !newRule.categoryId) return;
    setSaving(true);
    setLastResult(null);

    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.retroactivelyUpdated > 0) {
        setLastResult(`Rule created. ${data.retroactivelyUpdated} existing transactions updated.`);
      }
      setNewRule({ pattern: "", matchType: "CONTAINS", categoryId: "", applyRetroactively: false });
      setShowAdd(false);
      fetchRules();
    }

    setSaving(false);
  }

  async function deleteRule(id: string) {
    await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
    fetchRules();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" /> Transaction Rules
            </CardTitle>
            <CardDescription>
              Auto-categorize transactions by matching merchant names
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lastResult && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {lastResult}
          </div>
        )}

        {showAdd && (
          <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium">When description</label>
                <div className="flex gap-2">
                  <select
                    value={newRule.matchType}
                    onChange={(e) => setNewRule((p) => ({ ...p, matchType: e.target.value }))}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="CONTAINS">contains</option>
                    <option value="STARTS_WITH">starts with</option>
                    <option value="REGEX">matches regex</option>
                  </select>
                  <Input
                    placeholder="e.g., STARBUCKS"
                    value={newRule.pattern}
                    onChange={(e) => setNewRule((p) => ({ ...p, pattern: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Set category to</label>
                <select
                  value={newRule.categoryId}
                  onChange={(e) => setNewRule((p) => ({ ...p, categoryId: e.target.value }))}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newRule.applyRetroactively}
                  onChange={(e) => setNewRule((p) => ({ ...p, applyRetroactively: e.target.checked }))}
                  className="rounded"
                />
                Apply to existing transactions
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addRule} disabled={saving || !newRule.pattern || !newRule.categoryId}>
                  {saving ? "Creating..." : "Create Rule"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {rules.length === 0 && !showAdd ? (
          <p className="py-4 text-sm text-muted-foreground">
            No custom rules yet. Rules auto-categorize new transactions by matching merchant names.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {rule.matchType === "CONTAINS"
                      ? "contains"
                      : rule.matchType === "STARTS_WITH"
                        ? "starts with"
                        : "regex"}
                  </Badge>
                  <span className="font-mono text-sm">{rule.pattern}</span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <Badge variant="secondary" className="gap-1">
                    {rule.categoryIcon} {rule.categoryName}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
