import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find expense transactions > $50, no receipt, status PENDING
  const needingReceipts = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      type: "EXPENSE",
      receiptStatus: "PENDING",
      date: { gte: thirtyDaysAgo },
    },
    include: {
      category: true,
      receipts: { select: { id: true } },
    },
    orderBy: { amount: "desc" },
    take: 10,
  });

  // Filter to only those without receipts and amount > $50
  const reminders = needingReceipts
    .filter((tx) => tx.receipts.length === 0 && tx.amount.toNumber() >= 50)
    .map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount.toNumber(),
      date: tx.date.toISOString(),
      categoryName: tx.category?.name || null,
      categoryIcon: tx.category?.icon || null,
    }));

  return NextResponse.json({ reminders, count: reminders.length });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { transactionId, status } = body as {
    transactionId: string;
    status: "DISMISSED" | "MISSING";
  };

  if (!transactionId || !status) {
    return NextResponse.json({ error: "transactionId and status required" }, { status: 400 });
  }

  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx || tx.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { receiptStatus: status },
  });

  return NextResponse.json({ success: true });
}
