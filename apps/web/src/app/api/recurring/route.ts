import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";
import { detectRecurring } from "@drip/engine";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: twoYearsAgo },
    },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const input = transactions.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount.toNumber(),
    type: tx.type as "INCOME" | "EXPENSE",
    date: new Date(tx.date),
    categoryId: tx.categoryId,
    categoryName: tx.category?.name || null,
  }));

  const detected = detectRecurring(input);

  // Get already-confirmed recurring transactions
  const confirmed = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      isRecurring: true,
    },
    include: { category: true },
    orderBy: { date: "desc" },
    distinct: ["description"],
  });

  const confirmedList = confirmed.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount.toNumber(),
    type: tx.type,
    recurringPeriod: tx.recurringPeriod,
    recurringType: tx.recurringType || (tx.type === "INCOME" ? "INCOME" : "BILL"),
    date: tx.date.toISOString(),
    categoryName: tx.category?.name || null,
    categoryIcon: tx.category?.icon || null,
  }));

  // Filter detected to exclude already-confirmed
  const confirmedDescs = new Set(confirmed.map((t) => t.description.toUpperCase()));
  const suggestions = detected.filter(
    (d) => !confirmedDescs.has(d.description.toUpperCase())
  );

  // Compute totals by type
  const billsMonthly = confirmedList
    .filter((c) => c.recurringType === "BILL")
    .reduce((sum, c) => sum + monthlyAmount(c.amount, c.recurringPeriod), 0);
  const subscriptionsMonthly = confirmedList
    .filter((c) => c.recurringType === "SUBSCRIPTION")
    .reduce((sum, c) => sum + monthlyAmount(c.amount, c.recurringPeriod), 0);
  const incomeMonthly = confirmedList
    .filter((c) => c.recurringType === "INCOME")
    .reduce((sum, c) => sum + monthlyAmount(c.amount, c.recurringPeriod), 0);

  return NextResponse.json({
    confirmed: confirmedList,
    suggestions: suggestions.map((s) => ({
      ...s,
      lastDate: s.lastDate.toISOString(),
      nextExpectedDate: s.nextExpectedDate.toISOString(),
    })),
    totals: {
      billsMonthly: Math.round(billsMonthly * 100) / 100,
      billsDaily: Math.round((billsMonthly / 30) * 100) / 100,
      subscriptionsMonthly: Math.round(subscriptionsMonthly * 100) / 100,
      subscriptionsDaily: Math.round((subscriptionsMonthly / 30) * 100) / 100,
      incomeMonthly: Math.round(incomeMonthly * 100) / 100,
      incomeDaily: Math.round((incomeMonthly / 30) * 100) / 100,
    },
  });
}

function monthlyAmount(amount: number, period: string | null): number {
  switch (period) {
    case "WEEKLY": return amount * 4.33;
    case "BIWEEKLY": return amount * 2.17;
    case "MONTHLY": return amount;
    case "QUARTERLY": return amount / 3;
    case "YEARLY": return amount / 12;
    default: return amount;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { transactionIds, recurringPeriod, recurringType } = body as {
    transactionIds: string[];
    recurringPeriod: string;
    recurringType?: string;
  };

  if (!transactionIds?.length || !recurringPeriod) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.transaction.updateMany({
    where: {
      id: { in: transactionIds },
      userId: session.user.id,
    },
    data: {
      isRecurring: true,
      recurringPeriod: recurringPeriod as any,
      recurringType: (recurringType as any) || null,
    },
  });

  return NextResponse.json({ updated: transactionIds.length });
}
