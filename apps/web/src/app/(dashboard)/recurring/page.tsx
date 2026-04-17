"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Calendar, List, Check, X, Sparkles } from "lucide-react";

interface ConfirmedRecurring {
  id: string;
  description: string;
  amount: number;
  type: string;
  recurringPeriod: string | null;
  date: string;
  categoryName: string | null;
  categoryIcon: string | null;
}

interface SuggestedRecurring {
  description: string;
  avgAmount: number;
  frequency: string;
  frequencyLabel: string;
  dayOfMonth: number | null;
  lastDate: string;
  nextExpectedDate: string;
  transactionCount: number;
  transactionIds: string[];
  type: string;
  categoryName: string | null;
  confidence: number;
}

export default function RecurringPage() {
  const [confirmed, setConfirmed] = useState<ConfirmedRecurring[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedRecurring[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecurring();
  }, []);

  async function fetchRecurring() {
    setLoading(true);
    const res = await fetch("/api/recurring");
    const data = await res.json();
    setConfirmed(data.confirmed);
    setSuggestions(data.suggestions);
    setLoading(false);
  }

  async function confirmSuggestion(suggestion: SuggestedRecurring) {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionIds: suggestion.transactionIds,
        recurringPeriod: suggestion.frequency,
      }),
    });
    fetchRecurring();
  }

  function dismissSuggestion(index: number) {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  }

  // Build calendar data for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarItems: Record<number, { description: string; amount: number; type: string; icon: string | null }[]> = {};

  for (const item of confirmed) {
    // Estimate which day of month this recurs
    const txDate = new Date(item.date);
    const day = txDate.getDate();
    if (day <= daysInMonth) {
      if (!calendarItems[day]) calendarItems[day] = [];
      calendarItems[day].push({
        description: item.description,
        amount: item.amount,
        type: item.type,
        icon: item.categoryIcon,
      });
    }
  }

  // Also add suggestions to calendar based on nextExpectedDate
  for (const s of suggestions) {
    const next = new Date(s.nextExpectedDate);
    if (next.getMonth() === month && next.getFullYear() === year) {
      const day = next.getDate();
      if (!calendarItems[day]) calendarItems[day] = [];
      calendarItems[day].push({
        description: s.description,
        amount: s.avgAmount,
        type: s.type,
        icon: null,
      });
    }
  }

  const monthlyTotal = confirmed.reduce((sum, item) => {
    if (item.recurringPeriod === "MONTHLY") return sum + item.amount;
    if (item.recurringPeriod === "WEEKLY") return sum + item.amount * 4.33;
    if (item.recurringPeriod === "BIWEEKLY") return sum + item.amount * 2.17;
    if (item.recurringPeriod === "QUARTERLY") return sum + item.amount / 3;
    if (item.recurringPeriod === "YEARLY") return sum + item.amount / 12;
    return sum;
  }, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Recurring</h1>
        <p className="text-muted-foreground">Analyzing transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Recurring</h1>
          <p className="text-sm text-muted-foreground">
            {confirmed.length} recurring items &middot; ~{formatCurrency(monthlyTotal)}/month &middot;{" "}
            ~{formatCurrency(monthlyTotal / 30)}/day
          </p>
        </div>
        <div className="flex self-start rounded-md border">
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="gap-1 rounded-r-none"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" /> List
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "ghost"}
            size="sm"
            className="gap-1 rounded-l-none"
            onClick={() => setView("calendar")}
          >
            <Calendar className="h-4 w-4" /> Calendar
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Detected Recurring ({suggestions.length})
            </CardTitle>
            <CardDescription>
              We found patterns in your transactions. Confirm or dismiss.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={`${s.description}-${i}`}
                  className="flex items-center justify-between rounded-lg border bg-background p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.frequencyLabel} &middot; ~{formatCurrency(s.avgAmount)} &middot;{" "}
                      {s.transactionCount} occurrences &middot; {Math.round(s.confidence * 100)}% confidence
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                      onClick={() => confirmSuggestion(s)}
                    >
                      <Check className="h-3 w-3" /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissSuggestion(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirmed Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            {confirmed.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No recurring items yet. Confirm suggestions above or mark transactions as recurring.
              </p>
            ) : (
              <div className="space-y-2">
                {confirmed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.categoryIcon || "?"}</span>
                      <div>
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.categoryName} &middot;{" "}
                          {item.recurringPeriod?.toLowerCase().replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${item.type === "INCOME" ? "text-green-600" : ""}`}
                    >
                      {item.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {view === "calendar" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}

              {/* Empty cells for days before the 1st */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] rounded bg-muted/20 p-1" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const items = calendarItems[day] || [];
                const isToday = day === now.getDate();

                return (
                  <div
                    key={day}
                    className={`min-h-[80px] rounded border p-1 ${
                      isToday ? "border-primary bg-primary/5" : "border-transparent bg-muted/20"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {items.map((item, j) => (
                        <div
                          key={j}
                          className={`truncate rounded px-1 py-0.5 text-[10px] ${
                            item.type === "INCOME"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {formatCurrency(item.amount)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
