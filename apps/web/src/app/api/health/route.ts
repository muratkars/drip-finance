import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check DATABASE_URL is set
  checks.database_url = process.env.DATABASE_URL ? "set" : "missing";
  checks.nextauth_secret = process.env.NEXTAUTH_SECRET ? "set" : "missing";
  checks.nextauth_url = process.env.NEXTAUTH_URL || "not set";

  // Check Prisma client
  try {
    const { prisma } = await import("@drip/db");
    const userCount = await prisma.user.count();
    const categoryCount = await prisma.category.count();
    checks.prisma = "connected";
    checks.users = String(userCount);
    checks.categories = String(categoryCount);
  } catch (e: any) {
    checks.prisma = `error: ${e.message?.slice(0, 200)}`;
  }

  const allGood = checks.prisma === "connected" && checks.database_url === "set";

  return NextResponse.json(
    { status: allGood ? "ok" : "error", checks },
    { status: allGood ? 200 : 500 }
  );
}
