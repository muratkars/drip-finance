import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, Prisma } from "@drip/db";
import { computeSpread, assumptionToDays } from "@drip/engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("category");
  const type = searchParams.get("type") as "INCOME" | "EXPENSE" | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    ...(from && { date: { gte: new Date(from) } }),
    ...(to && { date: { ...((from && { gte: new Date(from) }) || {}), lte: new Date(to) } }),
    ...(categoryId && { categoryId }),
    ...(type && { type }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      ...t,
      amount: t.amount.toNumber(),
      dailyAmount: t.dailyAmount.toNumber(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { description, amount, type, date, categoryId, isRecurring, recurringPeriod } = body;

  if (!description || !amount || !type || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Load assumptions for spread
  const [userAssumptions, category] = await Promise.all([
    prisma.assumption.findMany({ where: { userId: session.user.id } }),
    categoryId ? prisma.category.findUnique({ where: { id: categoryId } }) : null,
  ]);

  const assumptions = new Map<string, number>();
  for (const a of userAssumptions) {
    assumptions.set(a.key, assumptionToDays(a.value, a.unit));
  }

  const categoryName = category?.name || "Uncategorized";
  const spread = computeSpread(
    { amount, description, categoryName, isRecurring: !!isRecurring, recurringPeriod },
    assumptions
  );

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      categoryId: categoryId || null,
      description,
      amount: (amount),
      type,
      date: new Date(date),
      spreadDays: spread.spreadDays,
      dailyAmount: (spread.dailyAmount),
      source: "MANUAL",
      isRecurring: !!isRecurring,
      recurringPeriod: recurringPeriod || null,
    },
    include: { category: true },
  });

  return NextResponse.json(
    {
      ...transaction,
      amount: transaction.amount.toNumber(),
      dailyAmount: transaction.dailyAmount.toNumber(),
    },
    { status: 201 }
  );
}
