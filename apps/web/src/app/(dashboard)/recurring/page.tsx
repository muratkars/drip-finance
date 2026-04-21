"use client";

import { useEffect, useState } from "react";
import { DripIcon } from "@/components/ui/drip-icons";
import {
  DripCard,
  DripButton,
  PerDay,
  Money,
  Pill,
  SectionHead,
  Liquid,
  fmtDaily,
  fmtMoney,
} from "@/components/ui/drip-primitives";

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

const KIND_ICON: Record<string, string> = {
  BILL: "card",
  SUBSCRIPTION: "receipt",
  INCOME: "wallet",
};

const KIND_LABEL: Record<string, string> = {
  BILL: "Bill",
  SUBSCRIPTION: "Subscription",
  INCOME: "Income",
};

const KIND_TONE: Record<string, "amber" | "purple" | "green"> = {
  BILL: "amber",
  SUBSCRIPTION: "purple",
  INCOME: "green",
};

const KIND_COLOR: Record<string, string> = {
  BILL: "#D97A3C",
  SUBSCRIPTION: "#A85BC4",
  INCOME: "#2F9E5C",
};

export default function RecurringPage() {
  const [confirmed, setConfirmed] = useState<ConfirmedRecurring[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedRecurring[]>([]);
  const [totals, setTotals] = useState<Totals>({
    billsMonthly: 0,
    billsDaily: 0,
    subscriptionsMonthly: 0,
    subscriptionsDaily: 0,
    incomeMonthly: 0,
    incomeDaily: 0,
  });
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

  const filteredConfirmed =
    filter === "all"
      ? confirmed
      : confirmed.filter((c) => c.recurringType === filter);

  // Calendar data
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarItems: Record<
    number,
    { description: string; amount: number; type: string; recurringType: string; icon: string | null }[]
  > = {};

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
      <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="drip-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 6 }}>
          Recurring
        </div>
        <h1
          className="font-display"
          style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--ink)", margin: 0 }}
        >
          The rhythm of <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>your money.</span>
        </h1>
        <p style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 16 }}>Analyzing transactions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
        <div>
          <div className="drip-eyebrow" style={{ color: "var(--ink-3)", marginBottom: 6 }}>
            Recurring
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--ink)", margin: 0 }}
          >
            The rhythm of{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>your money.</span>
          </h1>
        </div>

        {/* View toggle */}
        <div
          style={{
            display: "flex",
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--bg-2)",
          }}
        >
          {(["list", "calendar"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "inherit",
                border: "none",
                cursor: "pointer",
                transition: "all 150ms",
                background: view === v ? "var(--card-bg)" : "transparent",
                color: view === v ? "var(--ink)" : "var(--ink-3)",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                borderRadius: 8,
              }}
            >
              <DripIcon name={v === "list" ? "receipt" : "calendar"} size={14} />
              {v === "list" ? "List" : "Calendar"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {/* Bills */}
        <DripCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(217,122,60,0.12)",
                color: "#D97A3C",
              }}
            >
              <DripIcon name="card" size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Bills</span>
          </div>
          <PerDay amount={totals.billsDaily} size="md" />
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            {fmtMoney(totals.billsMonthly)}/month
          </p>
        </DripCard>

        {/* Subscriptions */}
        <DripCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(168,91,196,0.12)",
                color: "#A85BC4",
              }}
            >
              <DripIcon name="receipt" size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Subscriptions</span>
          </div>
          <PerDay amount={totals.subscriptionsDaily} size="md" />
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            {fmtMoney(totals.subscriptionsMonthly)}/month
          </p>
        </DripCard>

        {/* Recurring Income */}
        <DripCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(47,158,92,0.12)",
                color: "#2F9E5C",
              }}
            >
              <DripIcon name="wallet" size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Recurring Income</span>
          </div>
          <PerDay amount={totals.incomeDaily} size="md" color="#2F9E5C" />
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            {fmtMoney(totals.incomeMonthly)}/month
          </p>
        </DripCard>
      </div>

      {/* ── Detected recurring suggestions ── */}
      {suggestions.length > 0 && (
        <DripCard
          style={{
            marginBottom: 24,
            background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 8%, var(--card-bg)), color-mix(in oklch, var(--accent) 3%, var(--card-bg)))",
            border: "1px solid color-mix(in oklch, var(--accent) 18%, var(--line))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(63,76,217,0.12)",
                color: "var(--accent)",
              }}
            >
              <DripIcon name="spark" size={16} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                Detected Recurring ({suggestions.length})
              </span>
              <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>
                We found patterns in your transactions. Confirm or dismiss.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s, i) => {
              const tone = KIND_TONE[s.recurringType] || "amber";
              const icon = KIND_ICON[s.recurringType] || "card";
              const label = KIND_LABEL[s.recurringType] || "Bill";
              return (
                <div
                  key={`${s.description}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--card-bg)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                        {s.description}
                      </span>
                      <Pill tone={tone}>
                        <DripIcon name={icon} size={10} />
                        {label}
                      </Pill>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "4px 0 0" }}>
                      {s.frequencyLabel} &middot; ~{fmtMoney(s.avgAmount)} &middot;{" "}
                      {s.transactionCount} occurrences &middot; {Math.round(s.confidence * 100)}%
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <DripButton
                      variant="outline"
                      size="sm"
                      icon="check"
                      onClick={() => confirmSuggestion(s)}
                      style={{ color: "#2F9E5C", borderColor: "rgba(47,158,92,0.3)" }}
                    >
                      Confirm
                    </DripButton>
                    <DripButton variant="ghost" size="sm" onClick={() => dismissSuggestion(i)}>
                      <DripIcon name="x" size={14} />
                    </DripButton>
                  </div>
                </div>
              );
            })}
          </div>
        </DripCard>
      )}

      {/* ── Filter tabs ── */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: 10,
          padding: 3,
          background: "var(--bg-2)",
          marginBottom: 20,
        }}
      >
        {(["all", "BILL", "SUBSCRIPTION", "INCOME"] as FilterType[]).map((f) => {
          const isActive = filter === f;
          const count =
            f === "all"
              ? confirmed.length
              : confirmed.filter((c) => c.recurringType === f).length;
          const label = f === "all" ? "All" : `${KIND_LABEL[f]}s`;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "inherit",
                border: "none",
                cursor: "pointer",
                borderRadius: 8,
                whiteSpace: "nowrap",
                transition: "all 150ms",
                background: isActive ? "var(--card-bg)" : "transparent",
                color: isActive ? "var(--ink)" : "var(--ink-3)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── List View ── */}
      {view === "list" && (
        <DripCard padding={0}>
          {filteredConfirmed.length === 0 ? (
            <p style={{ padding: 24, fontSize: 13, color: "var(--ink-3)" }}>
              No{" "}
              {filter === "all"
                ? "recurring items"
                : `${KIND_LABEL[filter]?.toLowerCase()}s`}{" "}
              yet.
            </p>
          ) : (
            <div>
              {filteredConfirmed.map((item, idx) => {
                const tone = KIND_TONE[item.recurringType] || "amber";
                const label = KIND_LABEL[item.recurringType] || "Bill";
                const iconName = item.categoryIcon || KIND_ICON[item.recurringType] || "card";
                const kindColor = KIND_COLOR[item.recurringType] || "#D97A3C";
                const isIncome = item.type === "INCOME";
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom:
                        idx < filteredConfirmed.length - 1
                          ? "1px solid var(--line-soft)"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `color-mix(in oklch, ${kindColor} 12%, transparent)`,
                          color: kindColor,
                          flexShrink: 0,
                        }}
                      >
                        <DripIcon name={iconName} size={15} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ink)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.description}
                          </span>
                          <Pill tone={tone}>{label}</Pill>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "2px 0 0" }}>
                          {item.categoryName || "Uncategorized"} &middot;{" "}
                          {item.recurringPeriod?.toLowerCase().replace("_", " ") || "monthly"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                      <Money
                        amount={item.amount}
                        size="md"
                        color={isIncome ? "#2F9E5C" : undefined}
                        signed={isIncome}
                      />
                      <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "2px 0 0" }}>
                        {fmtDaily(item.amount / 30)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DripCard>
      )}

      {/* ── Calendar View ── */}
      {view === "calendar" && (
        <DripCard>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
              {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                style={{
                  padding: "6px 0",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  minHeight: 80,
                  borderRadius: 8,
                  background: "var(--bg-2)",
                  opacity: 0.4,
                  padding: 4,
                }}
              />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const items = calendarItems[day] || [];
              const isToday = day === now.getDate();

              return (
                <div
                  key={day}
                  style={{
                    minHeight: 80,
                    borderRadius: 8,
                    padding: 6,
                    background: isToday
                      ? "color-mix(in oklch, var(--accent) 5%, var(--card-bg))"
                      : "var(--bg-2)",
                    border: isToday
                      ? "1.5px solid var(--accent)"
                      : "1.5px solid transparent",
                    transition: "all 150ms",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? "var(--accent)" : "var(--ink-3)",
                    }}
                  >
                    {day}
                  </span>
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {items.map((item, j) => {
                      const dotColor = KIND_COLOR[item.recurringType] || "#D97A3C";
                      return (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10,
                            color: "var(--ink-2)",
                          }}
                          title={`${item.description}: ${fmtMoney(item.amount)}`}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: dotColor,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtMoney(item.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DripCard>
      )}
    </div>
  );
}
