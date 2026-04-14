"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Droplets } from "lucide-react";

interface DripSummaryProps {
  avgDailyIncome: number;
  avgDailyExpense: number;
  avgDailyNet: number;
}

export function DripSummary({ avgDailyIncome, avgDailyExpense, avgDailyNet }: DripSummaryProps) {
  const isPositive = avgDailyNet >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Your Daily Drip</CardTitle>
          <Droplets className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(avgDailyExpense)}</div>
          <p className="mt-1 text-xs text-muted-foreground">average daily spending</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Daily Income</CardTitle>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(avgDailyIncome)}</div>
          <p className="mt-1 text-xs text-muted-foreground">average daily earnings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Daily Net</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(avgDailyNet)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isPositive ? "saving per day" : "overspending per day"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
