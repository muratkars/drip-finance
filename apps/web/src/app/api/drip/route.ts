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
  const days = parseInt(searchParams.get("days") || "30");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all transactions that might affect this date range
  // A transaction affects a date if: date <= currentDay < date + spreadDays
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: {
        gte: new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000), // look back up to a year for long-spread items
        lte: endDate,
      },
    },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  // Build daily drip for each day in range
  const dailyData: Record<
    string,
    {
      date: string;
      income: number;
      expense: number;
      net: number;
      categories: Record<string, { name: string; icon: string | null; color: string | null; amount: number }>;
    }
  > = {};

  // Initialize each day
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    dailyData[key] = { date: key, income: 0, expense: 0, net: 0, categories: {} };
  }

  // Distribute each transaction's daily amount across its spread days
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const dailyAmt = tx.dailyAmount.toNumber();
    const categoryName = tx.category?.name || "Uncategorized";
    const categoryIcon = tx.category?.icon || null;
    const categoryColor = tx.category?.color || null;

    for (let day = 0; day < tx.spreadDays; day++) {
      const currentDay = new Date(txDate);
      currentDay.setDate(currentDay.getDate() + day);
      const key = currentDay.toISOString().split("T")[0];

      if (!dailyData[key]) continue;

      if (tx.type === "INCOME") {
        dailyData[key].income += dailyAmt;
      } else {
        dailyData[key].expense += dailyAmt;
      }

      if (!dailyData[key].categories[categoryName]) {
        dailyData[key].categories[categoryName] = {
          name: categoryName,
          icon: categoryIcon,
          color: categoryColor,
          amount: 0,
        };
      }
      dailyData[key].categories[categoryName].amount += dailyAmt;
    }
  }

  // Calculate net and round
  const dailyArray = Object.values(dailyData).map((d) => ({
    ...d,
    income: Math.round(d.income * 100) / 100,
    expense: Math.round(d.expense * 100) / 100,
    net: Math.round((d.income - d.expense) * 100) / 100,
  }));

  // Calculate averages
  const validDays = dailyArray.filter((d) => d.income > 0 || d.expense > 0);
  const avgIncome = validDays.length
    ? Math.round((validDays.reduce((s, d) => s + d.income, 0) / validDays.length) * 100) / 100
    : 0;
  const avgExpense = validDays.length
    ? Math.round((validDays.reduce((s, d) => s + d.expense, 0) / validDays.length) * 100) / 100
    : 0;

  // Category totals for the period
  const categoryTotals: Record<
    string,
    { name: string; icon: string | null; color: string | null; total: number; daily: number }
  > = {};

  for (const day of dailyArray) {
    for (const [name, cat] of Object.entries(day.categories)) {
      if (!categoryTotals[name]) {
        categoryTotals[name] = { name, icon: cat.icon, color: cat.color, total: 0, daily: 0 };
      }
      categoryTotals[name].total += cat.amount;
    }
  }

  for (const cat of Object.values(categoryTotals)) {
    cat.total = Math.round(cat.total * 100) / 100;
    cat.daily = Math.round((cat.total / days) * 100) / 100;
  }

  return NextResponse.json({
    period: { from: startDate.toISOString(), to: endDate.toISOString(), days },
    summary: {
      avgDailyIncome: avgIncome,
      avgDailyExpense: avgExpense,
      avgDailyNet: Math.round((avgIncome - avgExpense) * 100) / 100,
    },
    daily: dailyArray,
    categories: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
  });
}
