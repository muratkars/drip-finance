"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Calendar, List, Check, X, Sparkles, Receipt, CreditCard, Wallet } from "lucide-react";

interface ConfirmedRecurring {
  id: string;
  description: string;
  amount: number;
  type: string;
  recurringPeriod: string | null;
  recurringType: string;
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
  recurringType: string;
  categoryName: string | null;
  confidence: number;
}

interface Totals {
  billsMonthly: number;
  billsDaily: number;
  subscriptionsMonthly: number;
  subscriptionsDaily: number;
  incomeMonthly: number;
  incomeDaily: number;
}

type ViewMode = "list" | "calendar";
type FilterType = "all" | "BILL" | "SUBSCRIPTION" | "INCOME";

const TYPE_ICONS = {
  BILL: CreditCard,
  SUBSCRIPTION: Receipt,
  INCOME: Wallet,
};

const TYPE_LABELS = {
  BILL: "Bill",
  SUBSCRIPTION: "Subscription",
  INCOME: "Income",
};

const TYPE_COLORS = {
  BILL: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  SUBSCRIPTION: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  INCOME: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function RecurringPage() {
  const [confirmed, setConfirmed] = useState<ConfirmedRecurring[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedRecurring[]>([]);
  const [totals, setTotals] = useState<Totals>({ billsMonthly: 0, billsDaily: 0, subscriptionsMonthly: 0, subscriptionsDaily: 0, incomeMonthly: 0, incomeDaily: 0 });
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<FilterType>("all");
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
    setTotals(data.totals);
    setLoading(false);
  }

  async function confirmSuggestion(suggestion: SuggestedRecurring) {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionIds: suggestion.transactionIds,
        recurringPeriod: suggestion.frequency,
        recurringType: suggestion.recurringType,
      }),
    });
    fetchRecurring();
  }

  function dismissSuggestion(index: number) {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  }

  const filteredConfirmed = filter === "all"
    ? confirmed
    : confirmed.filter((c) => c.recurringType === filter);

  // Calendar data
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarItems: Record<number, { description: string; amount: number; type: string; recurringType: string; icon: string | null }[]> = {};

  for (const item of confirmed) {
    const txDate = new Date(item.date);
    const day = txDate.getDate();
    if (day <= daysInMonth) {
      if (!calendarItems[day]) calendarItems[day] = [];
      calendarItems[day].push({
        description: item.description,
        amount: item.amount,
        type: item.type,
        recurringType: item.recurringType,
        icon: item.categoryIcon,
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold sm:text-2xl">Recurring</h1>
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
            {confirmed.length} recurring items
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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" /> Bills
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totals.billsDaily)}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.billsMonthly)}/month · essential</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="h-4 w-4" /> Subscriptions
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totals.subscriptionsDaily)}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.subscriptionsMonthly)}/month · optimizable</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" /> Recurring Income
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totals.incomeDaily)}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.incomeMonthly)}/month</p>
          </CardContent>
        </Card>
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
              {suggestions.map((s, i) => {
                const TypeIcon = TYPE_ICONS[s.recurringType as keyof typeof TYPE_ICONS] || CreditCard;
                return (
                  <div
                    key={`${s.description}-${i}`}
                    className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{s.description}</p>
                        <Badge className={TYPE_COLORS[s.recurringType as keyof typeof TYPE_COLORS] || TYPE_COLORS.BILL}>
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {TYPE_LABELS[s.recurringType as keyof typeof TYPE_LABELS] || "Bill"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.frequencyLabel} · ~{formatCurrency(s.avgAmount)} ·{" "}
                        {s.transactionCount} occurrences · {Math.round(s.confidence * 100)}%
                      </p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => confirmSuggestion(s)}
                      >
                        <Check className="h-3 w-3" /> Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismissSuggestion(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex overflow-x-auto rounded-lg border bg-card">
        {(["all", "BILL", "SUBSCRIPTION", "INCOME"] as FilterType[]).map((f, i) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            } ${i === 0 ? "rounded-l-lg" : ""} ${i === 3 ? "rounded-r-lg" : ""}`}
          >
            {f === "all" ? `All (${confirmed.length})` : `${TYPE_LABELS[f as keyof typeof TYPE_LABELS]}s (${confirmed.filter((c) => c.recurringType === f).length})`}
          </button>
        ))}
      </div>

      {/* List View */}
      {view === "list" && (
        <Card>
          <CardContent className="p-0">
            {filteredConfirmed.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No {filter === "all" ? "recurring items" : `${TYPE_LABELS[filter as keyof typeof TYPE_LABELS]?.toLowerCase()}s`} yet.
              </p>
            ) : (
              <div className="divide-y">
                {filteredConfirmed.map((item) => {
                  const TypeIcon = TYPE_ICONS[item.recurringType as keyof typeof TYPE_ICONS] || CreditCard;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.categoryIcon || "?"}</span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{item.description}</p>
                            <Badge className={`text-[10px] ${TYPE_COLORS[item.recurringType as keyof typeof TYPE_COLORS] || TYPE_COLORS.BILL}`}>
                              {TYPE_LABELS[item.recurringType as keyof typeof TYPE_LABELS] || "Bill"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.categoryName} · {item.recurringPeriod?.toLowerCase().replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${item.type === "INCOME" ? "text-green-600" : ""}`}>
                        {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
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
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] rounded bg-muted/20 p-1" />
              ))}
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
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {items.map((item, j) => (
                        <div
                          key={j}
                          className={`truncate rounded px-1 py-0.5 text-[10px] ${
                            item.recurringType === "SUBSCRIPTION"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                              : item.type === "INCOME"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
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
