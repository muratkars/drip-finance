import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";
import { categorize } from "@drip/engine";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.categoryRule.findMany({
    where: { category: { userId: session.user.id } },
    include: { category: true },
    orderBy: [{ priority: "desc" }, { pattern: "asc" }],
  });

  return NextResponse.json(
    rules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      matchType: r.matchType,
      priority: r.priority,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      categoryIcon: r.category.icon,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pattern, matchType, categoryId, priority, applyRetroactively } = body;

  if (!pattern || !matchType || !categoryId) {
    return NextResponse.json({ error: "Pattern, matchType, and categoryId are required" }, { status: 400 });
  }

  // Verify the category belongs to this user
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== session.user.id && !category.isSystem)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // If category is system, create a user-owned copy to attach the rule to
  let ruleCategoryId = categoryId;
  if (category.isSystem) {
    // Create or find user's category with same name
    const userCat = await prisma.category.upsert({
      where: { name_userId: { name: category.name, userId: session.user.id } },
      update: {},
      create: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type,
        userId: session.user.id,
      },
    });
    ruleCategoryId = userCat.id;
  }

  const rule = await prisma.categoryRule.create({
    data: {
      categoryId: ruleCategoryId,
      pattern,
      matchType,
      priority: priority || 10,
    },
    include: { category: true },
  });

  // Apply retroactively if requested
  let retroCount = 0;
  if (applyRetroactively) {
    const allRules = await prisma.categoryRule.findMany({
      where: {
        OR: [
          { category: { userId: session.user.id } },
          { category: { isSystem: true } },
        ],
      },
      orderBy: { priority: "desc" },
    });

    const systemCategories = await prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId: session.user.id }] },
    });
    const systemCategoryMap: Record<string, string> = {};
    for (const cat of systemCategories) {
      systemCategoryMap[cat.name] = cat.id;
    }

    // Find uncategorized or matching transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
    });

    for (const tx of transactions) {
      const upper = tx.description.toUpperCase();
      const patternUpper = pattern.toUpperCase();
      let matches = false;

      if (matchType === "CONTAINS") matches = upper.includes(patternUpper);
      else if (matchType === "STARTS_WITH") matches = upper.startsWith(patternUpper);
      else if (matchType === "REGEX") {
        try { matches = new RegExp(pattern, "i").test(tx.description); } catch {}
      }

      if (matches && tx.categoryId !== categoryId) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { categoryId },
        });
        retroCount++;
      }
    }
  }

  return NextResponse.json({
    rule: {
      id: rule.id,
      pattern: rule.pattern,
      matchType: rule.matchType,
      priority: rule.priority,
      categoryId: rule.categoryId,
      categoryName: rule.category.name,
      categoryIcon: rule.category.icon,
    },
    retroactivelyUpdated: retroCount,
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ruleId = searchParams.get("id");

  if (!ruleId) {
    return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
  }

  const rule = await prisma.categoryRule.findUnique({
    where: { id: ruleId },
    include: { category: true },
  });

  if (!rule || rule.category.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.categoryRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ success: true });
}
