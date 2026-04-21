"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { DripIcon, Drop } from "@/components/ui/drip-icons";
import { DripCard, DripButton, PerDay, Money, CatBadge, Liquid, Sparkline, fmtDaily, fmtMoney } from "@/components/ui/drip-primitives";

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

interface RecapData {
  thisWeek: {
    income: number;
    expense: number;
    net: number;
    avgDailyDrip: number;
    transactionCount: number;
  };
  lastWeek: { avgDailyDrip: number };
  comparison: { dripChange: number; dripChangePercent: number; netChange: number };
  topCategory: { name: string; icon: string | null; color: string | null; total: number; daily: number } | null;
  biggestExpense: { description: string; amount: number; date: string } | null;
}

interface Reminder {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string | null;
  categoryIcon: string | null;
}

interface DripDashboardProps {
  recentTransactions: Transaction[];
}

export function DripDashboard({ recentTransactions }: DripDashboardProps) {
  const [dripData, setDripData] = useState<DripData | null>(null);
  const [recap, setRecap] = useState<RecapData | null>(null);

  useEffect(() => {
    fetch("/api/drip?days=30")
      .then((res) => res.json())
      .then(setDripData);
    fetch("/api/recap")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRecap);
  }, []);

  const dailyExp = dripData?.summary.avgDailyExpense ?? 0;
  const dailyInc = dripData?.summary.avgDailyIncome ?? 0;
  const dailyNet = dripData?.summary.avgDailyNet ?? 0;
  const categories = dripData?.categories ?? [];
  const maxCatDaily = categories.length > 0 ? Math.max(...categories.map((c) => c.daily)) : 1;

  const incomeSeries = useMemo(
    () => (dripData?.daily ?? []).map((d) => d.income),
    [dripData]
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <div className="drip-eyebrow mb-2" style={{ color: "var(--ink-3)" }}>{dateStr}</div>
          <h1
            className="font-display m-0"
            style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--ink)" }}
          >
            {greeting}.<br />
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>Your life costs </span>
            <span style={{ color: "var(--accent)" }}>{fmtDaily(dailyExp)}</span>
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}> to run.</span>
          </h1>
        </div>
      </div>

      {/* Week at a glance — always visible */}
      <WeekAtAGlance recap={recap} />

      {/* Receipt reminders — compact amber banner */}
      <ReceiptBanner />

      {/* Three hero summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <DripCard
          className="relative overflow-hidden"
          style={{
            border: "1px solid color-mix(in oklch, var(--accent) 40%, transparent)",
            background: "linear-gradient(135deg, var(--card-bg), color-mix(in oklch, var(--accent) 5%, var(--card-bg)))",
          }}
        >
          <div className="flex items-center gap-2 mb-3.5">
            <Drop size={16} className="text-[var(--accent)]" />
            <div className="drip-eyebrow font-semibold" style={{ color: "var(--accent)" }}>
              Your daily drip
            </div>
          </div>
          <PerDay amount={dailyExp} size="xxl" />
          <div className="mt-3 text-[12.5px] italic max-w-[280px]" style={{ color: "var(--ink-3)" }}>
            Every dollar casts a daily shadow. Yours is small today — keep it steady.
          </div>
          <div className="absolute -right-[30px] -bottom-[30px] opacity-[0.08]" style={{ color: "var(--accent)" }}>
            <Drop size={180} />
          </div>
        </DripCard>

        <DripCard>
          <div className="flex items-center gap-2 mb-3.5">
            <DripIcon name="trendup" size={14} className="text-[var(--green)]" />
            <div className="drip-eyebrow" style={{ color: "var(--ink-3)" }}>Daily income</div>
          </div>
          <PerDay amount={dailyInc} size="xl" color="var(--green)" />
          <div className="mt-3.5">
            <Sparkline data={incomeSeries.length > 0 ? incomeSeries : [0]} color="var(--green)" width={240} height={32} />
          </div>
        </DripCard>

        <DripCard>
          <div className="flex items-center gap-2 mb-3.5">
            <DripIcon
              name={dailyNet >= 0 ? "trendup" : "trenddown"}
              size={14}
              className={dailyNet >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}
            />
            <div className="drip-eyebrow" style={{ color: "var(--ink-3)" }}>Daily net</div>
          </div>
          <PerDay amount={dailyNet} size="xl" color={dailyNet >= 0 ? "var(--green)" : "var(--red)"} />
          <div className="mt-3.5 text-[11px]" style={{ color: "var(--ink-3)" }}>
            Projected{" "}
            <span className="font-num" style={{ color: "var(--ink-2)" }}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(dailyNet * 365)}
            </span>{" "}
            saved this year
          </div>
        </DripCard>
      </div>

      {/* Chart + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-5">
        <DripCard>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="drip-eyebrow mb-1" style={{ color: "var(--ink-3)" }}>Daily flow</div>
              <div className="font-display text-xl" style={{ letterSpacing: "-0.015em" }}>
                Income vs expense &middot; 30 days
              </div>
            </div>
            <div className="flex gap-4 text-[11px]" style={{ color: "var(--ink-3)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: "var(--green)" }} /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: "var(--red)" }} /> Expense
              </span>
            </div>
          </div>
          <FlowChart data={dripData?.daily ?? []} />
        </DripCard>

        <DripCard>
          <div className="mb-4">
            <div className="drip-eyebrow mb-1" style={{ color: "var(--ink-3)" }}>Where it drips</div>
            <div className="font-display text-xl" style={{ letterSpacing: "-0.015em" }}>
              Category breakdown
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {categories.slice(0, 7).map((c) => {
              const pct = (c.daily / maxCatDaily) * 100;
              return (
                <div key={c.name}>
                  <div className="flex justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-[12.5px]">
                      <span style={{ color: c.color || "#6366f1" }}>
                        <DripIcon name={c.icon || "basket"} size={12} />
                      </span>
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <span className="text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
                      {fmtDaily(c.daily)}
                    </span>
                  </div>
                  <Liquid pct={pct} color={c.color || "#6366f1"} height={5} />
                </div>
              );
            })}
            {categories.length === 0 && (
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                No category data yet. Upload transactions to see a breakdown.
              </p>
            )}
          </div>
        </DripCard>
      </div>

      {/* Recent transactions */}
      <DripCard padding={0}>
        <div
          className="flex justify-between items-center px-5 py-4"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div>
            <div className="drip-eyebrow mb-0.5" style={{ color: "var(--ink-3)" }}>Ledger</div>
            <div className="font-display text-xl" style={{ letterSpacing: "-0.015em" }}>
              Recent transactions
            </div>
          </div>
          <Link href="/transactions">
            <DripButton variant="ghost" size="sm">View all →</DripButton>
          </Link>
        </div>
        <div>
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>
              No transactions yet. Upload a statement to get started.
            </div>
          ) : (
            recentTransactions.map((t, i) => {
              const isIncome = t.type === "INCOME";
              return (
                <div
                  key={t.id}
                  className="grid items-center gap-4 px-5 py-3"
                  style={{
                    gridTemplateColumns: "72px 1fr 130px 120px 100px",
                    borderBottom: i < recentTransactions.length - 1 ? "1px solid var(--line-soft)" : "none",
                  }}
                >
                  <div className="text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
                    {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{
                        background: `color-mix(in oklch, ${t.category?.color || "#6366f1"} 12%, transparent)`,
                        color: t.category?.color || "#6366f1",
                      }}
                    >
                      <DripIcon name={t.category?.icon || "basket"} size={14} />
                    </div>
                    <div className="text-[13px] font-medium truncate">{t.description}</div>
                  </div>
                  <div>
                    {t.category && (
                      <CatBadge name={t.category.name} icon={t.category.icon} color={t.category.color} />
                    )}
                  </div>
                  <div className="text-right">
                    <Money amount={isIncome ? t.amount : -t.amount} size="sm" color={isIncome ? "var(--green)" : "var(--ink)"} signed />
                  </div>
                  <div className="text-right text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
                    {fmtDaily(t.dailyAmount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DripCard>
    </div>
  );
}

/* ─── Week at a Glance ─── */
function WeekAtAGlance({ recap }: { recap: RecapData | null }) {
  const thisWeek = recap?.thisWeek ?? { income: 0, expense: 0, net: 0, avgDailyDrip: 0, transactionCount: 0 };
  const comparison = recap?.comparison ?? { dripChange: 0, dripChangePercent: 0, netChange: 0 };
  const topCategory = recap?.topCategory ?? null;
  const biggestExpense = recap?.biggestExpense ?? null;
  const dripDown = comparison.dripChange < 0;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date();
  const rangeStr = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <DripCard padding={0} className="mb-5 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--ink-2)", letterSpacing: "-0.005em" }}>
          Your week at a glance
        </div>
        <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
          {rangeStr}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {/* Daily drip */}
        <div className="p-[18px_20px_20px]" style={{ borderRight: "1px solid var(--line)" }}>
          <div className="drip-eyebrow mb-2.5" style={{ color: "var(--ink-3)" }}>Daily drip</div>
          <PerDay amount={thisWeek.avgDailyDrip} size="lg" />
          {comparison.dripChange !== 0 && (
            <div
              className="flex items-center gap-1 mt-2.5 text-[11px]"
              style={{ color: dripDown ? "var(--green)" : "var(--red)" }}
            >
              <DripIcon name={dripDown ? "down" : "up"} size={11} />
              <span className="font-num">{Math.abs(comparison.dripChangePercent).toFixed(1)}%</span>
              <span style={{ color: "var(--ink-3)" }}>vs last wk</span>
            </div>
          )}
        </div>

        {/* Weekly net */}
        <div className="p-[18px_20px_20px]" style={{ borderRight: "1px solid var(--line)" }}>
          <div className="drip-eyebrow mb-2.5" style={{ color: "var(--ink-3)" }}>Weekly net</div>
          <Money
            amount={thisWeek.net}
            size="xl"
            signed
            decimals={0}
            color={thisWeek.net >= 0 ? "var(--green)" : "var(--red)"}
          />
          {(thisWeek.income > 0 || thisWeek.expense > 0) && (
            <div className="mt-2 text-[11px]" style={{ color: "var(--ink-3)" }}>
              <span className="font-num">{fmtMoney(thisWeek.income, { decimals: 0 })}</span> in · <span className="font-num">{fmtMoney(-thisWeek.expense, { decimals: 0 })}</span> out
            </div>
          )}
        </div>

        {/* Top category */}
        <div className="p-[18px_20px_20px]" style={{ borderRight: "1px solid var(--line)" }}>
          <div className="drip-eyebrow mb-2.5" style={{ color: "var(--ink-3)" }}>Top category</div>
          {topCategory ? (
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                style={{
                  background: `color-mix(in oklch, ${topCategory.color || "#6366f1"} 14%, transparent)`,
                  color: topCategory.color || "#6366f1",
                }}
              >
                <DripIcon name={topCategory.icon || "basket"} size={18} />
              </div>
              <div>
                <div className="text-[15px] font-medium">{topCategory.name}</div>
                <div className="text-[11px] font-num" style={{ color: "var(--ink-3)" }}>
                  {fmtDaily(topCategory.daily)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[13px]" style={{ color: "var(--ink-3)" }}>—</div>
          )}
        </div>

        {/* Biggest hit */}
        <div className="p-[18px_20px_20px]">
          <div className="drip-eyebrow mb-2.5" style={{ color: "var(--ink-3)" }}>Biggest hit</div>
          {biggestExpense ? (
            <>
              <Money amount={-biggestExpense.amount} size="lg" decimals={0} />
              <div className="text-[11px] mt-1" style={{ color: "var(--ink-3)" }}>
                {biggestExpense.description}
              </div>
            </>
          ) : (
            <div className="text-[13px]" style={{ color: "var(--ink-3)" }}>—</div>
          )}
        </div>
      </div>
    </DripCard>
  );
}

/* ─── Receipt Banner ─── */
function ReceiptBanner() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/receipts/reminders")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setReminders(data.reminders));
  }, []);

  async function dismiss(id: string) {
    await fetch("/api/receipts/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: id, status: "DISMISSED" }),
    });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function uploadReceipt(id: string, file: File) {
    setUploadingId(id);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("transactionId", id);
    const res = await fetch("/api/receipts/ocr", { method: "POST", body: formData });
    if (res.ok) setReminders((prev) => prev.filter((r) => r.id !== id));
    setUploadingId(null);
  }

  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0] && reminders[0]) uploadReceipt(reminders[0].id, files[0]);
    },
    [reminders]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"], "application/pdf": [".pdf"] },
    maxFiles: 1,
    noClick: false,
  });

  if (reminders.length === 0) return null;

  const summaryText = reminders
    .slice(0, 3)
    .map((r) => `${r.description} (${fmtMoney(-r.amount, { decimals: 0 })})`)
    .join(" · ");

  return (
    <DripCard
      padding={0}
      className="mb-5"
      style={{
        background: "color-mix(in oklch, #D97A3C 8%, var(--card-bg))",
        borderColor: "color-mix(in oklch, #D97A3C 22%, transparent)",
      }}
    >
      <div className="flex items-center gap-3.5 px-[18px] py-3.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(217,122,60,0.18)", color: "#9a501f" }}
        >
          <DripIcon name="receipt" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium" style={{ color: "#9a501f" }}>
            {reminders.length} larger expense{reminders.length > 1 ? "s" : ""} missing receipts
          </div>
          <div className="text-[11.5px] mt-0.5 truncate" style={{ color: "#9a501f", opacity: 0.8 }}>
            {summaryText}
          </div>
        </div>
        <div {...getRootProps()} className="flex-shrink-0">
          <input {...getInputProps()} />
          <DripButton size="sm" variant="default" icon="upload">
            {uploadingId ? "Processing..." : "Upload"}
          </DripButton>
        </div>
        <DripButton
          size="sm"
          variant="ghost"
          onClick={() => reminders.forEach((r) => dismiss(r.id))}
          className="flex-shrink-0"
        >
          Dismiss
        </DripButton>
      </div>
    </DripCard>
  );
}

/* ─── Flow Chart (SVG) ─── */
function FlowChart({ data }: { data: { income: number; expense: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: "var(--ink-3)" }}>
        Not enough data to chart yet.
      </div>
    );
  }

  const w = 700, h = 180, pad = 12;
  const incomes = data.map((d) => d.income);
  const expenses = data.map((d) => d.expense);
  const max = Math.max(...incomes, ...expenses, 1);
  const step = (w - pad * 2) / (data.length - 1);

  const toPts = (arr: number[]) =>
    arr.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const inPts = toPts(incomes);
  const exPts = toPts(expenses);
  const toPath = (pts: number[][]) => "M" + pts.map((p) => p.join(",")).join(" L");
  const toArea = (pts: number[][]) => toPath(pts) + ` L${w - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 180, display: "block" }}>
      <defs>
        <linearGradient id="greenGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="redGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--red)" stopOpacity={0.2} />
          <stop offset="100%" stopColor="var(--red)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p, i) => (
        <line
          key={i}
          x1={pad}
          y1={pad + (h - pad * 2) * p}
          x2={w - pad}
          y2={pad + (h - pad * 2) * p}
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
      ))}
      <path d={toArea(inPts)} fill="url(#greenGrad)" />
      <path d={toArea(exPts)} fill="url(#redGrad)" />
      <path d={toPath(inPts)} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={toPath(exPts)} fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
