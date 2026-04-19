import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // This week: last 7 days
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  // Last week: 14 to 7 days ago
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);

  const [thisWeekTxs, lastWeekTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: { not: "TRANSFER" },
        date: { gte: thisWeekStart, lte: now },
      },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: { not: "TRANSFER" },
        date: { gte: lastWeekStart, lt: thisWeekStart },
      },
      include: { category: true },
    }),
  ]);

  // This week stats
  let thisIncome = 0;
  let thisExpense = 0;
  const thisCategorySums: Record<string, { name: string; icon: string | null; total: number }> = {};
  let biggestExpense: { description: string; amount: number; date: string } | null = null;

  for (const tx of thisWeekTxs) {
    const amt = tx.amount.toNumber();
    if (tx.type === "INCOME") {
      thisIncome += amt;
    } else {
      thisExpense += amt;
      const catName = tx.category?.name || "Uncategorized";
      if (!thisCategorySums[catName]) {
        thisCategorySums[catName] = { name: catName, icon: tx.category?.icon || null, total: 0 };
      }
      thisCategorySums[catName].total += amt;

      if (!biggestExpense || amt > biggestExpense.amount) {
        biggestExpense = { description: tx.description, amount: amt, date: tx.date.toISOString() };
      }
    }
  }

  // Last week stats
  let lastIncome = 0;
  let lastExpense = 0;
  for (const tx of lastWeekTxs) {
    const amt = tx.amount.toNumber();
    if (tx.type === "INCOME") lastIncome += amt;
    else lastExpense += amt;
  }

  const thisAvgDaily = Math.round((thisExpense / 7) * 100) / 100;
  const lastAvgDaily = Math.round((lastExpense / 7) * 100) / 100;
  const dripChange = thisAvgDaily - lastAvgDaily;
  const dripChangePercent = lastAvgDaily > 0
    ? Math.round((dripChange / lastAvgDaily) * 100)
    : 0;

  // Top spending category
  const topCategory = Object.values(thisCategorySums).sort((a, b) => b.total - a.total)[0] || null;

  const thisNet = thisIncome - thisExpense;
  const lastNet = lastIncome - lastExpense;

  return NextResponse.json({
    thisWeek: {
      income: Math.round(thisIncome * 100) / 100,
      expense: Math.round(thisExpense * 100) / 100,
      net: Math.round(thisNet * 100) / 100,
      avgDailyDrip: thisAvgDaily,
      transactionCount: thisWeekTxs.length,
    },
    lastWeek: {
      income: Math.round(lastIncome * 100) / 100,
      expense: Math.round(lastExpense * 100) / 100,
      net: Math.round(lastNet * 100) / 100,
      avgDailyDrip: lastAvgDaily,
    },
    comparison: {
      dripChange: Math.round(dripChange * 100) / 100,
      dripChangePercent,
      netChange: Math.round((thisNet - lastNet) * 100) / 100,
    },
    topCategory: topCategory ? {
      name: topCategory.name,
      icon: topCategory.icon,
      total: Math.round(topCategory.total * 100) / 100,
      daily: Math.round((topCategory.total / 7) * 100) / 100,
    } : null,
    biggestExpense,
  });
}
