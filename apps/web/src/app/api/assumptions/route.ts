import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";
import { computeSpread, assumptionToDays } from "@drip/engine";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assumptions = await prisma.assumption.findMany({
    where: { userId: session.user.id },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(assumptions);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assumptions } = (await req.json()) as {
    assumptions: { key: string; name: string; value: number; unit: string; categoryId?: string }[];
  };

  if (!assumptions || !Array.isArray(assumptions)) {
    return NextResponse.json({ error: "Invalid assumptions data" }, { status: 400 });
  }

  // Upsert each assumption
  const results = await Promise.all(
    assumptions.map((a) =>
      prisma.assumption.upsert({
        where: { userId_key: { userId: session.user.id, key: a.key } },
        update: { value: a.value, unit: a.unit as any, name: a.name, categoryId: a.categoryId || null },
        create: {
          userId: session.user.id,
          key: a.key,
          name: a.name,
          value: a.value,
          unit: a.unit as any,
          categoryId: a.categoryId || null,
        },
      })
    )
  );

  // Recalculate affected transactions
  const allAssumptions = await prisma.assumption.findMany({
    where: { userId: session.user.id },
  });

  const assumptionMap = new Map<string, number>();
  for (const a of allAssumptions) {
    assumptionMap.set(a.key, assumptionToDays(a.value, a.unit));
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    include: { category: true },
  });

  let recalculated = 0;
  for (const tx of transactions) {
    const spread = computeSpread(
      {
        amount: tx.amount.toNumber(),
        description: tx.description,
        categoryName: tx.category?.name || "Uncategorized",
        isRecurring: tx.isRecurring,
        recurringPeriod: tx.recurringPeriod,
      },
      assumptionMap
    );

    if (spread.spreadDays !== tx.spreadDays) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          spreadDays: spread.spreadDays,
          dailyAmount: (spread.dailyAmount),
        },
      });
      recalculated++;
    }
  }

  return NextResponse.json({
    updated: results.length,
    recalculated,
  });
}
