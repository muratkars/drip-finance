import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "spending"; // spending | income | networth
  const groupBy = searchParams.get("groupBy") || "category"; // category | merchant
  const period = searchParams.get("period") || "month"; // month | quarter | year
  const months = parseInt(searchParams.get("months") || "6");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  if (tab === "networth") {
    return handleNetWorth(session.user.id, startDate, endDate, period);
  }

  const type = tab === "income" ? "INCOME" : "EXPENSE";

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      type,
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  // Group by category or merchant
  const byGroup: Record<string, { name: string; icon: string | null; color: string | null; total: number }> = {};
  for (const tx of transactions) {
    const key = groupBy === "merchant" ? tx.description : (tx.category?.name || "Uncategorized");
    if (!byGroup[key]) {
      byGroup[key] = {
        name: key,
        icon: groupBy === "category" ? (tx.category?.icon || null) : null,
        color: groupBy === "category" ? (tx.category?.color || "#6366f1") : null,
        total: 0,
      };
    }
    byGroup[key].total += tx.amount.toNumber();
  }

  const totals = Object.values(byGroup)
    .map((g) => ({ ...g, total: Math.round(g.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Over time: group by period
  const overTime: Record<string, Record<string, number>> = {};

  for (const tx of transactions) {
    const d = new Date(tx.date);
    let periodKey: string;
    if (period === "year") {
      periodKey = `${d.getFullYear()}`;
    } else if (period === "quarter") {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      periodKey = `${d.getFullYear()} Q${q}`;
    } else {
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const groupKey = groupBy === "merchant" ? tx.description : (tx.category?.name || "Uncategorized");

    if (!overTime[periodKey]) overTime[periodKey] = {};
    overTime[periodKey][groupKey] = (overTime[periodKey][groupKey] || 0) + tx.amount.toNumber();
  }

  // Build sorted timeline
  const periods = Object.keys(overTime).sort();
  const allGroups = [...new Set(transactions.map((tx) =>
    groupBy === "merchant" ? tx.description : (tx.category?.name || "Uncategorized")
  ))];

  const timeline = periods.map((p) => {
    const entry: Record<string, string | number> = { period: p };
    for (const g of allGroups) {
      entry[g] = Math.round((overTime[p][g] || 0) * 100) / 100;
    }
    entry._total = Math.round(
      Object.values(overTime[p]).reduce((s, v) => s + v, 0) * 100
    ) / 100;
    return entry;
  });

  const grandTotal = Math.round(totals.reduce((s, t) => s + t.total, 0) * 100) / 100;

  return NextResponse.json({
    tab,
    groupBy,
    period,
    totals,
    timeline,
    groups: allGroups,
    grandTotal,
    dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
  });
}

async function handleNetWorth(userId: string, startDate: Date, endDate: Date, period: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { lte: endDate } },
    orderBy: { date: "asc" },
  });

  // Build cumulative net worth over time
  const periodTotals: Record<string, { income: number; expense: number }> = {};

  for (const tx of transactions) {
    const d = new Date(tx.date);
    let periodKey: string;
    if (period === "year") {
      periodKey = `${d.getFullYear()}`;
    } else if (period === "quarter") {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      periodKey = `${d.getFullYear()} Q${q}`;
    } else {
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!periodTotals[periodKey]) periodTotals[periodKey] = { income: 0, expense: 0 };

    if (tx.type === "INCOME") {
      periodTotals[periodKey].income += tx.amount.toNumber();
    } else {
      periodTotals[periodKey].expense += tx.amount.toNumber();
    }
  }

  const periods = Object.keys(periodTotals).sort();
  let cumulative = 0;
  const timeline = periods.map((p) => {
    const { income, expense } = periodTotals[p];
    cumulative += income - expense;
    return {
      period: p,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    };
  });

  return NextResponse.json({
    tab: "networth",
    period,
    timeline,
    currentNetWorth: timeline.length > 0 ? timeline[timeline.length - 1].cumulative : 0,
    dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
  });
}
