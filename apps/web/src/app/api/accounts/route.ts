import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const ASSET_TYPES = ["CHECKING", "SAVINGS", "INVESTMENT", "CASH"];
  const LIABILITY_TYPES = ["CREDIT_CARD", "LOAN"];

  const serialized = accounts.map((a) => ({
    ...a,
    balance: a.balance.toNumber(),
    isAsset: ASSET_TYPES.includes(a.type),
  }));

  const totalAssets = serialized
    .filter((a) => a.isAsset && a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = serialized
    .filter((a) => !a.isAsset && a.isActive)
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  return NextResponse.json({
    accounts: serialized,
    summary: {
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, type, balance, institution, lastFour, color } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  const account = await prisma.financialAccount.create({
    data: {
      userId: session.user.id,
      name,
      type,
      balance: balance || 0,
      institution: institution || null,
      lastFour: lastFour || null,
      color: color || null,
    },
  });

  return NextResponse.json({ ...account, balance: account.balance.toNumber() }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Account ID required" }, { status: 400 });
  }

  const existing = await prisma.financialAccount.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.financialAccount.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ ...updated, balance: updated.balance.toNumber() });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Account ID required" }, { status: 400 });
  }

  const existing = await prisma.financialAccount.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.financialAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
