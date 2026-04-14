"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PieChartIcon, BarChart3 } from "lucide-react";

interface CategoryTotal {
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
}

interface TimelineEntry {
  period: string;
  [key: string]: string | number;
}

interface SpendingChartProps {
  totals: CategoryTotal[];
  timeline: TimelineEntry[];
  groups: string[];
  grandTotal: number;
  title: string;
}

const COLORS = [
  "#4f46e5", "#0891b2", "#16a34a", "#dc2626", "#7c3aed",
  "#f59e0b", "#ec4899", "#0d9488", "#e11d48", "#6366f1",
  "#22c55e", "#3b82f6", "#8b5cf6", "#10b981", "#06b6d4",
];

export function SpendingChart({ totals, timeline, groups, grandTotal, title }: SpendingChartProps) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [mode, setMode] = useState<"total" | "time">("total");

  const colorMap: Record<string, string> = {};
  totals.forEach((t, i) => {
    colorMap[t.name] = t.color || COLORS[i % COLORS.length];
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={mode === "total" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setMode("total")}
              >
                Total
              </Button>
              <Button
                variant={mode === "time" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setMode("time")}
              >
                Over Time
              </Button>
            </div>
            {mode === "total" && (
              <div className="flex rounded-md border">
                <Button
                  variant={chartType === "pie" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setChartType("pie")}
                >
                  <PieChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === "bar" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setChartType("bar")}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : mode === "total" ? (
          <div className="flex gap-6">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={300}>
                {chartType === "pie" ? (
                  <PieChart>
                    <Pie
                      data={totals}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {totals.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                ) : (
                  <BarChart data={totals} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {totals.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="w-48 space-y-2">
              <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
              <p className="text-xs text-muted-foreground">Total</p>
              <div className="mt-4 space-y-1.5">
                {totals.slice(0, 8).map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.color || COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate">{t.icon} {t.name}</span>
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(t.total)}</span>
                  </div>
                ))}
                {totals.length > 8 && (
                  <p className="text-xs text-muted-foreground">+{totals.length - 8} more</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              {groups.slice(0, 10).map((g, i) => (
                <Bar
                  key={g}
                  dataKey={g}
                  stackId="stack"
                  fill={colorMap[g] || COLORS[i % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
