"use client";

import { useEffect, useState } from "react";
import { DripSummary } from "@/components/dashboard/drip-summary";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

interface DripData {
  summary: {
    avgDailyIncome: number;
    avgDailyExpense: number;
    avgDailyNet: number;
  };
  daily: { date: string; income: number; expense: number; net: number }[];
  categories: { name: string; icon: string | null; color: string | null; total: number; daily: number }[];
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  dailyAmount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  spreadDays: number;
  category: { name: string; icon: string | null; color: string | null } | null;
}

interface DripDashboardProps {
  recentTransactions: Transaction[];
}

export function DripDashboard({ recentTransactions }: DripDashboardProps) {
  const [dripData, setDripData] = useState<DripData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/drip?days=${days}`)
      .then((res) => res.json())
      .then(setDripData);
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      <DripSummary
        avgDailyIncome={dripData?.summary.avgDailyIncome ?? 0}
        avgDailyExpense={dripData?.summary.avgDailyExpense ?? 0}
        avgDailyNet={dripData?.summary.avgDailyNet ?? 0}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart data={dripData?.daily ?? []} />
        <CategoryBreakdown categories={dripData?.categories ?? []} />
      </div>

      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
}
