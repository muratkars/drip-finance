import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@drip/db";
import { parseCsv, categorizeBatch, transactionHash } from "@drip/engine";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const csvContent = await file.text();
  const { transactions: parsed, format, errors } = parseCsv(csvContent);

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No transactions found", details: errors },
      { status: 400 }
    );
  }

  // Load categorization rules, system category map, and existing hashes for dedup
  const hashes = parsed.map((tx) => transactionHash(tx));

  const [userRules, systemRules, systemCategories, existingTxs] = await Promise.all([
    prisma.categoryRule.findMany({
      where: { category: { userId: session.user.id } },
      orderBy: { priority: "desc" },
    }),
    prisma.categoryRule.findMany({
      where: { category: { isSystem: true } },
      orderBy: { priority: "desc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId: session.user.id }] },
    }),
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        dedupHash: { in: hashes },
      },
      select: { dedupHash: true, description: true, amount: true, date: true },
    }),
  ]);

  const existingHashes = new Set(existingTxs.map((t) => t.dedupHash));

  const allRules = [...userRules, ...systemRules].map((r) => ({
    categoryId: r.categoryId,
    matchType: r.matchType as "CONTAINS" | "STARTS_WITH" | "REGEX",
    pattern: r.pattern,
    priority: r.priority,
  }));

  const systemCategoryMap: Record<string, string> = {};
  const categoryLookup: Record<string, { name: string; icon: string | null; color: string | null }> = {};
  for (const cat of systemCategories) {
    systemCategoryMap[cat.name] = cat.id;
    categoryLookup[cat.id] = { name: cat.name, icon: cat.icon, color: cat.color };
  }

  // Categorize
  const descriptions = parsed.map((t) => t.description);
  const categorized = categorizeBatch(descriptions, allRules, systemCategoryMap);

  // Also detect duplicates within the uploaded file itself
  const seenInFile = new Map<string, number>();

  // Build preview with duplicate flags
  const preview = parsed.map((tx, i) => {
    const hash = hashes[i];
    const isDuplicateInDb = existingHashes.has(hash);

    const fileCount = seenInFile.get(hash) || 0;
    seenInFile.set(hash, fileCount + 1);
    const isDuplicateInFile = fileCount > 0;

    return {
      hash,
      date: tx.date.toISOString(),
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      categoryId: categorized[i].categoryId,
      categoryName: categoryLookup[categorized[i].categoryId]?.name || "Uncategorized",
      categoryIcon: categoryLookup[categorized[i].categoryId]?.icon || null,
      confidence: categorized[i].confidence,
      isDuplicate: isDuplicateInDb || isDuplicateInFile,
      duplicateSource: isDuplicateInDb ? "existing" as const : isDuplicateInFile ? "file" as const : null,
    };
  });

  const duplicateCount = preview.filter((p) => p.isDuplicate).length;

  return NextResponse.json({
    format,
    count: preview.length,
    duplicateCount,
    errors,
    preview,
    categories: systemCategories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
    })),
  });
}
