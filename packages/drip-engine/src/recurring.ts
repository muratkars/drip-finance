/**
 * Detect recurring transactions by analyzing patterns in transaction history.
 * Groups by merchant/description, checks for regular intervals and similar amounts.
 */

interface TransactionInput {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: Date;
  categoryId: string | null;
  categoryName: string | null;
}

export type RecurringTypeGuess = "BILL" | "SUBSCRIPTION" | "INCOME";

export interface DetectedRecurring {
  description: string;
  avgAmount: number;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  frequencyLabel: string;
  dayOfMonth: number | null;
  lastDate: Date;
  nextExpectedDate: Date;
  transactionCount: number;
  transactionIds: string[];
  type: "INCOME" | "EXPENSE";
  recurringType: RecurringTypeGuess;
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
}

// Categories that are typically bills (essential, hard to cancel)
const BILL_CATEGORIES = new Set([
  "Housing", "Utilities", "Insurance", "Transport", "Healthcare", "Education",
]);

// Categories that are typically subscriptions (discretionary, can cancel)
const SUBSCRIPTION_CATEGORIES = new Set([
  "Subscriptions", "Entertainment", "Coffee", "Dining", "Shopping",
]);

// Merchant keywords that suggest subscriptions
const SUBSCRIPTION_KEYWORDS = [
  "NETFLIX", "SPOTIFY", "HULU", "DISNEY", "HBO", "YOUTUBE", "APPLE.COM",
  "AMAZON PRIME", "GYM", "FITNESS", "MEMBERSHIP", "SUBSCRIPTION",
  "DROPBOX", "ICLOUD", "GOOGLE STORAGE", "ADOBE",
];

/**
 * Guess whether a recurring transaction is a BILL, SUBSCRIPTION, or INCOME.
 */
function guessRecurringType(
  txType: "INCOME" | "EXPENSE",
  categoryName: string | null,
  description: string,
): RecurringTypeGuess {
  if (txType === "INCOME") return "INCOME";

  // Check merchant keywords first (most specific)
  const upper = description.toUpperCase();
  for (const kw of SUBSCRIPTION_KEYWORDS) {
    if (upper.includes(kw)) return "SUBSCRIPTION";
  }

  // Check category
  if (categoryName) {
    if (BILL_CATEGORIES.has(categoryName)) return "BILL";
    if (SUBSCRIPTION_CATEGORIES.has(categoryName)) return "SUBSCRIPTION";
  }

  // Default: if amount is large (>$50/mo), likely a bill; otherwise subscription
  return "BILL";
}

const FREQUENCY_RANGES = [
  { name: "WEEKLY" as const, label: "Weekly", minDays: 5, maxDays: 9, periodDays: 7 },
  { name: "BIWEEKLY" as const, label: "Every 2 weeks", minDays: 12, maxDays: 16, periodDays: 14 },
  { name: "MONTHLY" as const, label: "Monthly", minDays: 26, maxDays: 35, periodDays: 30 },
  { name: "QUARTERLY" as const, label: "Quarterly", minDays: 80, maxDays: 100, periodDays: 91 },
  { name: "YEARLY" as const, label: "Yearly", minDays: 350, maxDays: 380, periodDays: 365 },
];

/**
 * Normalize a merchant description for grouping.
 * Strips trailing numbers, reference IDs, dates, and normalizes whitespace.
 */
function normalizeDescription(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/\b\d{4,}\b/g, "") // strip long numbers (card#, ref#)
    .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "") // strip dates
    .replace(/\b(REF|TXN|TRANS|AUTH|SEQ)[#:\s]*\w+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if two amounts are "similar" (within 10% or $2 of each other).
 */
function amountsSimilar(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2;
  return diff <= 2 || diff / avg <= 0.1;
}

/**
 * Detect recurring transaction patterns from a list of transactions.
 * Requires at least 2 occurrences to detect a pattern.
 */
export function detectRecurring(transactions: TransactionInput[]): DetectedRecurring[] {
  // Group transactions by normalized description
  const groups = new Map<string, TransactionInput[]>();

  for (const tx of transactions) {
    const key = normalizeDescription(tx.description);
    if (!key) continue;
    const existing = groups.get(key) || [];
    existing.push(tx);
    groups.set(key, existing);
  }

  const detected: DetectedRecurring[] = [];

  for (const [, txs] of groups) {
    if (txs.length < 2) continue;

    // Sort by date
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Check amounts are similar
    const amounts = sorted.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const allSimilar = amounts.every((a) => amountsSimilar(a, avgAmount));
    if (!allSimilar) continue;

    // Calculate intervals between consecutive transactions
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const daysDiff = Math.round(
        (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    if (intervals.length === 0) continue;

    // Find matching frequency
    const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;

    let bestMatch = null;
    let bestConfidence = 0;

    for (const freq of FREQUENCY_RANGES) {
      if (avgInterval >= freq.minDays && avgInterval <= freq.maxDays) {
        // Calculate consistency: how close are individual intervals to the expected period
        const deviations = intervals.map((i) => Math.abs(i - freq.periodDays) / freq.periodDays);
        const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length;
        const confidence = Math.max(0, 1 - avgDeviation);

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = freq;
        }
      }
    }

    if (!bestMatch || bestConfidence < 0.5) continue;

    const lastTx = sorted[sorted.length - 1];
    const nextExpected = new Date(lastTx.date);
    nextExpected.setDate(nextExpected.getDate() + bestMatch.periodDays);

    // Determine common day of month for monthly+
    let dayOfMonth: number | null = null;
    if (bestMatch.name === "MONTHLY" || bestMatch.name === "QUARTERLY" || bestMatch.name === "YEARLY") {
      const days = sorted.map((t) => t.date.getDate());
      const commonDay = days.sort((a, b) =>
        days.filter((d) => d === a).length - days.filter((d) => d === b).length
      ).pop()!;
      dayOfMonth = commonDay;
    }

    detected.push({
      description: sorted[0].description,
      avgAmount: Math.round(avgAmount * 100) / 100,
      frequency: bestMatch.name,
      frequencyLabel: bestMatch.label,
      dayOfMonth,
      lastDate: lastTx.date,
      nextExpectedDate: nextExpected,
      transactionCount: sorted.length,
      transactionIds: sorted.map((t) => t.id),
      type: sorted[0].type,
      recurringType: guessRecurringType(sorted[0].type, sorted[0].categoryName, sorted[0].description),
      categoryId: sorted[0].categoryId,
      categoryName: sorted[0].categoryName,
      confidence: Math.round(bestConfidence * 100) / 100,
    });
  }

  return detected.sort((a, b) => b.confidence - a.confidence);
}
