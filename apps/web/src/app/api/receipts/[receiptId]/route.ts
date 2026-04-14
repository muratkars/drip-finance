import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiptId } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { transaction: { select: { userId: true } } },
  });

  if (!receipt || receipt.transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(receipt.fileData, {
    headers: {
      "Content-Type": receipt.fileType,
      "Content-Disposition": `inline; filename="${receipt.fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiptId } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { transaction: { select: { userId: true } } },
  });

  if (!receipt || receipt.transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.receipt.delete({ where: { id: receiptId } });

  return NextResponse.json({ success: true });
}
