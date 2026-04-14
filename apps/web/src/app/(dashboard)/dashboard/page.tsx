import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";
import { DripDashboard } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const recentTransactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    include: { category: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  const serialized = recentTransactions.map((t: typeof recentTransactions[number]) => ({
    id: t.id,
    description: t.description,
    amount: t.amount.toNumber(),
    dailyAmount: t.dailyAmount.toNumber(),
    type: t.type as "INCOME" | "EXPENSE",
    date: t.date.toISOString(),
    spreadDays: t.spreadDays,
    category: t.category
      ? { name: t.category.name, icon: t.category.icon, color: t.category.color }
      : null,
  }));

  return <DripDashboard recentTransactions={serialized} />;
}
