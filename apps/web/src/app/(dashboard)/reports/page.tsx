"use client";

import { useEffect, useState } from "react";
import { SpendingChart } from "@/components/reports/spending-chart";
import { NetWorthChart } from "@/components/reports/networth-chart";
import { SankeyChart } from "@/components/reports/sankey-chart";
import { DripSelect } from "@/components/ui/drip-primitives";

type Tab = "spending" | "income" | "cashflow" | "networth";
type GroupBy = "category" | "merchant";
type Period = "month" | "quarter" | "year";

const TABS: { key: Tab; label: string }[] = [
  { key: "spending", label: "Spending" },
  { key: "income", label: "Income" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "networth", label: "Net Worth" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("spending");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [period, setPeriod] = useState<Period>("month");
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<any>(null);
  const [sankeyData, setSankeyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === "cashflow") {
      fetchSankey();
    } else {
      fetchData();
    }
  }, [tab, groupBy, period, months]);

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams({
      tab: tab === "cashflow" ? "spending" : tab,
      groupBy,
      period,
      months: String(months),
    });
    const res = await fetch(`/api/reports?${params}`);
    setData(await res.json());
    setLoading(false);
  }

  async function fetchSankey() {
    setLoading(true);
    const [incRes, expRes] = await Promise.all([
      fetch(`/api/reports?tab=income&groupBy=category&period=${period}&months=${months}`),
      fetch(`/api/reports?tab=spending&groupBy=category&period=${period}&months=${months}`),
    ]);
    const incData = await incRes.json();
    const expData = await expRes.json();

    const COLORS = [
      "#4f46e5", "#0891b2", "#16a34a", "#dc2626", "#7c3aed",
      "#f59e0b", "#ec4899", "#0d9488", "#e11d48", "#6366f1",
    ];

    setSankeyData({
      incomes: (incData.totals || []).map((t: any, i: number) => ({
        name: t.name,
        amount: t.total,
        color: t.color || COLORS[i % COLORS.length],
      })),
      expenses: (expData.totals || []).map((t: any, i: number) => ({
        name: t.name,
        amount: t.total,
        color: t.color || COLORS[i % COLORS.length],
      })),
      totalIncome: incData.grandTotal || 0,
      totalExpense: expData.grandTotal || 0,
    });
    setLoading(false);
  }

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div className="mb-6">
        <div className="drip-eyebrow mb-2" style={{ color: "var(--ink-3)" }}>Reports</div>
        <h1
          className="font-display m-0"
          style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05 }}
        >
          Zoom out. <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>See patterns.</span>
        </h1>
      </div>

      {/* Tabs + filters */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2.5">
        <div
          className="flex gap-1 rounded-[10px] p-1"
          style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3.5 py-[7px] rounded-[7px] text-[12.5px] font-medium cursor-pointer transition-colors"
              style={{
                background: tab === t.key ? "var(--ink)" : "transparent",
                color: tab === t.key ? "var(--bg)" : "var(--ink-3)",
                border: "none",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(tab === "spending" || tab === "income") && (
            <DripSelect
              value={groupBy}
              onChange={(v) => setGroupBy(v as GroupBy)}
              options={[
                { value: "category", label: "Group: Category" },
                { value: "merchant", label: "Group: Merchant" },
              ]}
            />
          )}
          {tab !== "cashflow" && (
            <DripSelect
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              options={[
                { value: "month", label: "Monthly" },
                { value: "quarter", label: "Quarterly" },
                { value: "year", label: "Yearly" },
              ]}
            />
          )}
          <DripSelect
            value={String(months)}
            onChange={(v) => setMonths(Number(v))}
            options={[
              { value: "3", label: "Last 3 mo" },
              { value: "6", label: "Last 6 mo" },
              { value: "12", label: "Last 12 mo" },
              { value: "24", label: "Last 24 mo" },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: "var(--ink-3)" }}>
          Loading reports...
        </div>
      ) : tab === "cashflow" ? (
        <SankeyChart data={sankeyData || { incomes: [], expenses: [], totalIncome: 0, totalExpense: 0 }} />
      ) : tab === "networth" ? (
        <NetWorthChart
          timeline={data?.timeline || []}
          currentNetWorth={data?.currentNetWorth || 0}
        />
      ) : (
        <SpendingChart
          totals={data?.totals || []}
          timeline={data?.timeline || []}
          groups={data?.groups || []}
          grandTotal={data?.grandTotal || 0}
          title={tab === "spending" ? "Spending Breakdown" : "Income Breakdown"}
        />
      )}
    </div>
  );
}
