import { PrismaClient, TransactionType, MatchType, AssumptionUnit } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: "Housing", icon: "🏠", color: "#4f46e5", type: TransactionType.EXPENSE },
  { name: "Utilities", icon: "💡", color: "#0891b2", type: TransactionType.EXPENSE },
  { name: "Groceries", icon: "🛒", color: "#16a34a", type: TransactionType.EXPENSE },
  { name: "Coffee", icon: "☕", color: "#92400e", type: TransactionType.EXPENSE },
  { name: "Dining", icon: "🍽️", color: "#dc2626", type: TransactionType.EXPENSE },
  { name: "Transport", icon: "🚗", color: "#7c3aed", type: TransactionType.EXPENSE },
  { name: "Insurance", icon: "🛡️", color: "#0d9488", type: TransactionType.EXPENSE },
  { name: "Subscriptions", icon: "📺", color: "#e11d48", type: TransactionType.EXPENSE },
  { name: "Shopping", icon: "🛍️", color: "#f59e0b", type: TransactionType.EXPENSE },
  { name: "Healthcare", icon: "🏥", color: "#06b6d4", type: TransactionType.EXPENSE },
  { name: "Education", icon: "📚", color: "#8b5cf6", type: TransactionType.EXPENSE },
  { name: "Entertainment", icon: "🎬", color: "#ec4899", type: TransactionType.EXPENSE },
  { name: "Salary", icon: "💰", color: "#22c55e", type: TransactionType.INCOME },
  { name: "Freelance", icon: "💻", color: "#3b82f6", type: TransactionType.INCOME },
  { name: "Investments", icon: "📈", color: "#10b981", type: TransactionType.INCOME },
  { name: "Other Income", icon: "💵", color: "#6366f1", type: TransactionType.INCOME },
  { name: "Uncategorized", icon: "❓", color: "#9ca3af", type: TransactionType.EXPENSE },
];

const CATEGORY_RULES: Record<string, { pattern: string; matchType: MatchType }[]> = {
  Housing: [
    { pattern: "MORTGAGE", matchType: MatchType.CONTAINS },
    { pattern: "RENT", matchType: MatchType.CONTAINS },
    { pattern: "HOA", matchType: MatchType.CONTAINS },
  ],
  Utilities: [
    { pattern: "ELECTRIC", matchType: MatchType.CONTAINS },
    { pattern: "GAS BILL", matchType: MatchType.CONTAINS },
    { pattern: "WATER BILL", matchType: MatchType.CONTAINS },
    { pattern: "INTERNET", matchType: MatchType.CONTAINS },
    { pattern: "COMCAST", matchType: MatchType.CONTAINS },
    { pattern: "AT&T", matchType: MatchType.CONTAINS },
    { pattern: "VERIZON", matchType: MatchType.CONTAINS },
    { pattern: "T-MOBILE", matchType: MatchType.CONTAINS },
  ],
  Groceries: [
    { pattern: "KROGER", matchType: MatchType.CONTAINS },
    { pattern: "WHOLE FOODS", matchType: MatchType.CONTAINS },
    { pattern: "TRADER JOE", matchType: MatchType.CONTAINS },
    { pattern: "SAFEWAY", matchType: MatchType.CONTAINS },
    { pattern: "WALMART", matchType: MatchType.CONTAINS },
    { pattern: "COSTCO", matchType: MatchType.CONTAINS },
    { pattern: "TARGET", matchType: MatchType.CONTAINS },
    { pattern: "ALDI", matchType: MatchType.CONTAINS },
  ],
  Coffee: [
    { pattern: "STARBUCKS", matchType: MatchType.CONTAINS },
    { pattern: "DUNKIN", matchType: MatchType.CONTAINS },
    { pattern: "PEET", matchType: MatchType.CONTAINS },
    { pattern: "BLUE BOTTLE", matchType: MatchType.CONTAINS },
  ],
  Dining: [
    { pattern: "DOORDASH", matchType: MatchType.CONTAINS },
    { pattern: "GRUBHUB", matchType: MatchType.CONTAINS },
    { pattern: "UBER EATS", matchType: MatchType.CONTAINS },
    { pattern: "RESTAURANT", matchType: MatchType.CONTAINS },
    { pattern: "MCDONALD", matchType: MatchType.CONTAINS },
    { pattern: "CHIPOTLE", matchType: MatchType.CONTAINS },
  ],
  Transport: [
    { pattern: "UBER", matchType: MatchType.STARTS_WITH },
    { pattern: "LYFT", matchType: MatchType.CONTAINS },
    { pattern: "SHELL", matchType: MatchType.STARTS_WITH },
    { pattern: "CHEVRON", matchType: MatchType.CONTAINS },
    { pattern: "EXXON", matchType: MatchType.CONTAINS },
    { pattern: "PARKING", matchType: MatchType.CONTAINS },
  ],
  Insurance: [
    { pattern: "STATE FARM", matchType: MatchType.CONTAINS },
    { pattern: "GEICO", matchType: MatchType.CONTAINS },
    { pattern: "ALLSTATE", matchType: MatchType.CONTAINS },
    { pattern: "PROGRESSIVE", matchType: MatchType.CONTAINS },
    { pattern: "INSURANCE", matchType: MatchType.CONTAINS },
  ],
  Subscriptions: [
    { pattern: "NETFLIX", matchType: MatchType.CONTAINS },
    { pattern: "SPOTIFY", matchType: MatchType.CONTAINS },
    { pattern: "HULU", matchType: MatchType.CONTAINS },
    { pattern: "DISNEY+", matchType: MatchType.CONTAINS },
    { pattern: "APPLE.COM/BILL", matchType: MatchType.CONTAINS },
    { pattern: "AMAZON PRIME", matchType: MatchType.CONTAINS },
    { pattern: "HBO", matchType: MatchType.CONTAINS },
    { pattern: "YOUTUBE PREMIUM", matchType: MatchType.CONTAINS },
  ],
  Salary: [
    { pattern: "PAYROLL", matchType: MatchType.CONTAINS },
    { pattern: "DIRECT DEP", matchType: MatchType.CONTAINS },
    { pattern: "ADP", matchType: MatchType.CONTAINS },
    { pattern: "GUSTO", matchType: MatchType.CONTAINS },
  ],
};

async function main() {
  console.log("Seeding system categories...");

  const categoryIds: Record<string, string> = {};

  for (const cat of SYSTEM_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name_userId: { name: cat.name, userId: "" } },
      update: {},
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isSystem: true,
        userId: null,
      },
    });
    categoryIds[cat.name] = category.id;
    console.log(`  ✓ ${cat.icon} ${cat.name}`);
  }

  console.log("\nSeeding categorization rules...");

  for (const [categoryName, rules] of Object.entries(CATEGORY_RULES)) {
    const categoryId = categoryIds[categoryName];
    if (!categoryId) continue;

    for (const rule of rules) {
      await prisma.categoryRule.upsert({
        where: {
          id: `${categoryId}-${rule.pattern}`,
        },
        update: {},
        create: {
          categoryId,
          matchType: rule.matchType,
          pattern: rule.pattern,
          priority: rule.matchType === MatchType.STARTS_WITH ? 10 : 0,
        },
      });
    }
    console.log(`  ✓ ${categoryName}: ${rules.length} rules`);
  }

  console.log("\nDone seeding!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
