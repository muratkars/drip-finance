import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, Prisma } from "@drip/db";
import { computeSpread, assumptionToDays, CATEGORY_DEFAULT_SPREAD } from "@drip/engine";

interface CommitTransaction {
  hash: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  accountId?: string;
  rawCsvLine?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactions } = (await req.json()) as { transactions: CommitTransaction[] };

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ error: "No transactions to commit" }, { status: 400 });
  }

  // Load assumptions and categories for spread computation
  const [userAssumptions, categories] = await Promise.all([
    prisma.assumption.findMany({ where: { userId: session.user.id } }),
    prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId: session.user.id }] },
    }),
  ]);

  const assumptions = new Map<string, number>();
  for (const a of userAssumptions) {
    assumptions.set(a.key, assumptionToDays(a.value, a.unit));
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const batchId = crypto.randomUUID();

  const data: Prisma.TransactionCreateManyInput[] = transactions.map((tx) => {
    const categoryName = categoryMap.get(tx.categoryId) || "Uncategorized";
    const spread = computeSpread(
      {
        amount: tx.amount,
        description: tx.description,
        categoryName,
        isRecurring: false,
      },
      assumptions
    );

    return {
      userId: session.user.id,
      categoryId: tx.categoryId || null,
      description: tx.description,
      amount: (tx.amount),
      type: tx.type,
      date: new Date(tx.date),
      spreadDays: spread.spreadDays,
      dailyAmount: (spread.dailyAmount),
      source: "CSV_IMPORT" as const,
      fromAccountId: tx.accountId || null,
      rawCsvLine: tx.rawCsvLine || null,
      uploadBatchId: batchId,
      dedupHash: tx.hash || null,
    };
  });

  const result = await prisma.transaction.createMany({ data });

  return NextResponse.json({
    imported: result.count,
    batchId,
  });
}
