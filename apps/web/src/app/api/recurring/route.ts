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

  // Get all transactions for detection (last 2 years)
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

  // Also get already-confirmed recurring transactions
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
    date: tx.date.toISOString(),
    categoryName: tx.category?.name || null,
    categoryIcon: tx.category?.icon || null,
  }));

  // Filter detected to exclude already-confirmed
  const confirmedDescs = new Set(confirmed.map((t) => t.description.toUpperCase()));
  const suggestions = detected.filter(
    (d) => !confirmedDescs.has(d.description.toUpperCase())
  );

  return NextResponse.json({
    confirmed: confirmedList,
    suggestions: suggestions.map((s) => ({
      ...s,
      lastDate: s.lastDate.toISOString(),
      nextExpectedDate: s.nextExpectedDate.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { transactionIds, recurringPeriod } = body as {
    transactionIds: string[];
    recurringPeriod: string;
  };

  if (!transactionIds?.length || !recurringPeriod) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Mark all matching transactions as recurring
  await prisma.transaction.updateMany({
    where: {
      id: { in: transactionIds },
      userId: session.user.id,
    },
    data: {
      isRecurring: true,
      recurringPeriod: recurringPeriod as any,
    },
  });

  return NextResponse.json({ updated: transactionIds.length });
}
