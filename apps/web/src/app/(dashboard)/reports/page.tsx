"use client";

import { useEffect, useState } from "react";
import { SpendingChart } from "@/components/reports/spending-chart";
import { NetWorthChart } from "@/components/reports/networth-chart";
import { SankeyChart } from "@/components/reports/sankey-chart";

type Tab = "spending" | "income" | "cashflow" | "networth";
type GroupBy = "category" | "merchant";
type Period = "month" | "quarter" | "year";

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
    // Fetch both income and spending data
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

  const TABS: { key: Tab; label: string }[] = [
    { key: "spending", label: "Spending" },
    { key: "income", label: "Income" },
    { key: "cashflow", label: "Cash Flow" },
    { key: "networth", label: "Net Worth" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Analyze your financial data</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border bg-card">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              } ${i === 0 ? "rounded-l-lg" : ""} ${i === TABS.length - 1 ? "rounded-r-lg" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {(tab === "spending" || tab === "income") && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="category">By Category</option>
              <option value="merchant">By Merchant</option>
            </select>
          )}
          {tab !== "cashflow" && (
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
          )}
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 2 years</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading reports...</div>
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
