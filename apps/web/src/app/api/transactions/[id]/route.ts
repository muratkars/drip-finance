import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, Prisma } from "@drip/db";
import { computeSpread, assumptionToDays } from "@drip/engine";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      category: true,
      items: { include: { category: true } },
      receipts: {
        select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
      },
    },
  });

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...transaction,
    amount: transaction.amount.toNumber(),
    dailyAmount: transaction.dailyAmount.toNumber(),
    items: transaction.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toNumber(),
      totalPrice: item.totalPrice.toNumber(),
      dailyAmount: item.dailyAmount.toNumber(),
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { categoryId, spreadDays, isRecurring, recurringPeriod, description } = body;

  const updateData: Prisma.TransactionUpdateInput = {};

  if (description !== undefined) updateData.description = description;
  if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
  if (recurringPeriod !== undefined) updateData.recurringPeriod = recurringPeriod || null;
  if (categoryId !== undefined) {
    updateData.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
  }

  // Recalculate spread if category or spread changed
  if (spreadDays !== undefined) {
    updateData.spreadDays = spreadDays;
    updateData.dailyAmount = (
      Math.round((existing.amount.toNumber() / spreadDays) * 100) / 100
    );
  } else if (categoryId !== undefined || isRecurring !== undefined) {
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
      {
        amount: existing.amount.toNumber(),
        description: description || existing.description,
        categoryName,
        isRecurring: isRecurring ?? existing.isRecurring,
        recurringPeriod: recurringPeriod ?? existing.recurringPeriod,
      },
      assumptions
    );

    updateData.spreadDays = spread.spreadDays;
    updateData.dailyAmount = (spread.dailyAmount);
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: updateData,
    include: { category: true },
  });

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toNumber(),
    dailyAmount: updated.dailyAmount.toNumber(),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
