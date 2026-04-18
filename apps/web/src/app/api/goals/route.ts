import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
  });

  // Get user's average daily surplus for projections
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: thirtyDaysAgo },
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.type === "INCOME") totalIncome += tx.dailyAmount.toNumber();
    else totalExpense += tx.dailyAmount.toNumber();
  }

  const days = 30;
  const avgDailySurplus = Math.round(((totalIncome - totalExpense) / days) * 100) / 100;

  const enriched = goals.map((g) => {
    const target = g.targetAmount.toNumber();
    const current = g.currentAmount.toNumber();
    const monthly = g.monthlyPayment?.toNumber() || 0;
    const apr = g.apr?.toNumber() || 0;

    let remaining = target - current;
    let dailyNeeded = 0;
    let daysLeft = 0;
    let projectedDate: string | null = null;
    let status: "on_track" | "ahead" | "at_risk" | "completed" = "on_track";

    if (g.isCompleted) {
      status = "completed";
    } else if (g.type === "SAVE_UP") {
      remaining = Math.max(0, target - current);
      if (g.targetDate) {
        daysLeft = Math.max(1, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        dailyNeeded = Math.round((remaining / daysLeft) * 100) / 100;

        if (dailyNeeded <= 0) status = "completed";
        else if (monthly > 0 && monthly / 30 >= dailyNeeded) status = "ahead";
        else if (avgDailySurplus >= dailyNeeded) status = "on_track";
        else status = "at_risk";
      } else if (monthly > 0) {
        daysLeft = Math.ceil(remaining / (monthly / 30));
        dailyNeeded = Math.round((monthly / 30) * 100) / 100;
        const proj = new Date();
        proj.setDate(proj.getDate() + daysLeft);
        projectedDate = proj.toISOString();
      }
    } else {
      // PAY_DOWN: remaining is the current balance (current = debt remaining)
      remaining = current;
      if (monthly > 0) {
        // Simple amortization estimate
        if (apr > 0) {
          const monthlyRate = apr / 100 / 12;
          if (monthly <= current * monthlyRate) {
            daysLeft = -1; // payment doesn't cover interest
            status = "at_risk";
          } else {
            const monthsToPayoff = Math.ceil(
              -Math.log(1 - (current * monthlyRate) / monthly) / Math.log(1 + monthlyRate)
            );
            daysLeft = monthsToPayoff * 30;
            const proj = new Date();
            proj.setDate(proj.getDate() + daysLeft);
            projectedDate = proj.toISOString();
            dailyNeeded = Math.round((monthly / 30) * 100) / 100;
            status = "on_track";
          }
        } else {
          daysLeft = Math.ceil(current / (monthly / 30));
          dailyNeeded = Math.round((monthly / 30) * 100) / 100;
          const proj = new Date();
          proj.setDate(proj.getDate() + daysLeft);
          projectedDate = proj.toISOString();
          status = "on_track";
        }
      }
    }

    return {
      ...g,
      targetAmount: target,
      currentAmount: current,
      monthlyPayment: monthly,
      apr,
      remaining: Math.round(remaining * 100) / 100,
      dailyNeeded,
      daysLeft,
      projectedDate,
      status,
      progress: target > 0 ? Math.round(((g.type === "SAVE_UP" ? current : target - current) / target) * 100) : 0,
    };
  });

  return NextResponse.json({
    goals: enriched,
    avgDailySurplus,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, type, targetAmount, currentAmount, targetDate, apr, monthlyPayment, color } = body;

  if (!name || !type || !targetAmount) {
    return NextResponse.json({ error: "Name, type, and target amount are required" }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      name,
      type,
      targetAmount,
      currentAmount: currentAmount || 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      apr: apr || null,
      monthlyPayment: monthlyPayment || null,
      color: color || null,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
  }

  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Convert targetDate string to Date if present
  if (updates.targetDate) updates.targetDate = new Date(updates.targetDate);

  const updated = await prisma.goal.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Goal ID required" }, { status: 400 });
  }

  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
