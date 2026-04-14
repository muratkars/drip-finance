import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { items } = body as {
    items: { name: string; quantity: number; unitPrice: number; spreadDays: number; categoryId?: string }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  // Delete existing items and replace
  await prisma.transactionItem.deleteMany({ where: { transactionId: id } });

  const created = await Promise.all(
    items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      const dailyAmount = Math.round((totalPrice / item.spreadDays) * 100) / 100;

      return prisma.transactionItem.create({
        data: {
          transactionId: id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: (item.unitPrice),
          totalPrice: (totalPrice),
          spreadDays: item.spreadDays,
          dailyAmount: (dailyAmount),
          categoryId: item.categoryId || null,
        },
      });
    })
  );

  // Recalculate the transaction's daily amount based on items
  // Transaction dailyAmount = sum of all item dailyAmounts
  const totalDaily = created.reduce((sum, item) => sum + item.dailyAmount.toNumber(), 0);
  const maxSpread = Math.max(...created.map((item) => item.spreadDays));

  await prisma.transaction.update({
    where: { id },
    data: {
      dailyAmount: (Math.round(totalDaily * 100) / 100),
      spreadDays: maxSpread,
    },
  });

  return NextResponse.json({
    items: created.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toNumber(),
      totalPrice: item.totalPrice.toNumber(),
      dailyAmount: item.dailyAmount.toNumber(),
    })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transactionItem.deleteMany({ where: { transactionId: id } });

  // Reset transaction to default spread
  const amount = transaction.amount.toNumber();
  await prisma.transaction.update({
    where: { id },
    data: {
      spreadDays: 1,
      dailyAmount: (amount),
    },
  });

  return NextResponse.json({ success: true });
}
