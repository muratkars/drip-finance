import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { transactionIds, accountId } = body as {
    transactionIds: string[];
    accountId: string;
  };

  if (!transactionIds?.length || !accountId) {
    return NextResponse.json({ error: "transactionIds and accountId required" }, { status: 400 });
  }

  // Verify account belongs to user
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const result = await prisma.transaction.updateMany({
    where: {
      id: { in: transactionIds },
      userId: session.user.id,
    },
    data: { fromAccountId: accountId },
  });

  return NextResponse.json({ updated: result.count });
}
