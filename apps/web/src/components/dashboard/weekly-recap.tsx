"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Zap, ShoppingBag, ArrowRight } from "lucide-react";

interface RecapData {
  thisWeek: {
    income: number;
    expense: number;
    net: number;
    avgDailyDrip: number;
    transactionCount: number;
  };
  lastWeek: {
    avgDailyDrip: number;
  };
  comparison: {
    dripChange: number;
    dripChangePercent: number;
    netChange: number;
  };
  topCategory: { name: string; icon: string | null; total: number; daily: number } | null;
  biggestExpense: { description: string; amount: number; date: string } | null;
}

export function WeeklyRecap() {
  const [data, setData] = useState<RecapData | null>(null);

  useEffect(() => {
    fetch("/api/recap")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData);
  }, []);

  if (!data || data.thisWeek.transactionCount === 0) return null;

  const { thisWeek, comparison, topCategory, biggestExpense } = data;
  const dripUp = comparison.dripChange > 0;
  const dripFlat = comparison.dripChange === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Your Week at a Glance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Daily drip change */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Daily Drip</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(thisWeek.avgDailyDrip)}</p>
            <div className={`mt-1 flex items-center gap-1 text-xs ${dripUp ? "text-red-600" : dripFlat ? "text-muted-foreground" : "text-green-600"}`}>
              {dripUp ? (
                <TrendingUp className="h-3 w-3" />
              ) : dripFlat ? (
                <Minus className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {dripFlat
                ? "Same as last week"
                : `${formatCurrency(Math.abs(comparison.dripChange))} ${dripUp ? "more" : "less"} than last week`}
            </div>
          </div>

          {/* Weekly net */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Weekly Net</p>
            <p className={`mt-1 text-xl font-bold ${thisWeek.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(thisWeek.net)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(thisWeek.income)} in &middot; {formatCurrency(thisWeek.expense)} out
            </p>
          </div>

          {/* Top category */}
          {topCategory && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Top Spending</p>
              <p className="mt-1 text-xl font-bold">
                {topCategory.icon} {topCategory.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(topCategory.daily)}/day &middot; {formatCurrency(topCategory.total)} total
              </p>
            </div>
          )}

          {/* Biggest single expense */}
          {biggestExpense && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Biggest Expense</p>
              <p className="mt-1 truncate text-xl font-bold">{formatCurrency(biggestExpense.amount)}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {biggestExpense.description} &middot; {formatDate(biggestExpense.date)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
