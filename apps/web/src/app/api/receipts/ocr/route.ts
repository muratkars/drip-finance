import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";
import { createOcrProvider, matchReceiptToTransaction } from "@drip/engine";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const transactionId = formData.get("transactionId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Run OCR
  const ocr = createOcrProvider();
  let receiptData;
  try {
    receiptData = await ocr.extractFromReceipt(buffer, file.type);
  } catch (e: any) {
    return NextResponse.json({ error: `OCR failed: ${e.message}` }, { status: 500 });
  }

  // If transactionId provided, attach receipt directly
  if (transactionId) {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.userId !== session.user.id) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Save receipt file
    const receipt = await prisma.receipt.create({
      data: {
        transactionId,
        fileName: file.name,
        fileType: file.type,
        fileData: buffer,
        fileSize: file.size,
      },
    });

    // Create line items from OCR if items were found
    if (receiptData.items.length > 0) {
      await prisma.transactionItem.deleteMany({ where: { transactionId } });
      for (const item of receiptData.items) {
        await prisma.transactionItem.create({
          data: {
            transactionId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            spreadDays: 1,
            dailyAmount: item.totalPrice,
          },
        });
      }
    }

    // Mark receipt as uploaded
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { receiptStatus: "UPLOADED" },
    });

    return NextResponse.json({
      receipt: { id: receipt.id, fileName: receipt.fileName },
      ocrData: receiptData,
      matched: true,
      transactionId,
    });
  }

  // No transactionId — try to auto-match
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      type: "EXPENSE",
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    include: { receipts: { select: { id: true } } },
  });

  const candidates = recentTransactions.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount.toNumber(),
    date: new Date(tx.date),
    hasReceipt: tx.receipts.length > 0,
  }));

  const match = matchReceiptToTransaction(receiptData, candidates);

  // Save receipt if we found a match
  if (match && match.confidence >= 0.5) {
    const receipt = await prisma.receipt.create({
      data: {
        transactionId: match.transactionId,
        fileName: file.name,
        fileType: file.type,
        fileData: buffer,
        fileSize: file.size,
      },
    });

    // Create line items from OCR
    if (receiptData.items.length > 0) {
      for (const item of receiptData.items) {
        await prisma.transactionItem.create({
          data: {
            transactionId: match.transactionId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            spreadDays: 1,
            dailyAmount: item.totalPrice,
          },
        });
      }
    }

    await prisma.transaction.update({
      where: { id: match.transactionId },
      data: { receiptStatus: "UPLOADED" },
    });

    return NextResponse.json({
      receipt: { id: receipt.id, fileName: receipt.fileName },
      ocrData: receiptData,
      matched: true,
      transactionId: match.transactionId,
      matchConfidence: match.confidence,
      matchReasons: match.matchReasons,
    });
  }

  // No match found — return OCR data for manual assignment
  return NextResponse.json({
    ocrData: receiptData,
    matched: false,
    transactionId: null,
  });
}
