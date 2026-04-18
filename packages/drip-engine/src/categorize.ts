import type { CategorizeResult } from "./types";

interface CategoryRule {
  categoryId: string;
  matchType: "CONTAINS" | "STARTS_WITH" | "REGEX";
  pattern: string;
  priority: number;
}

/**
 * Clean a transaction description for better matching.
 * Strips card numbers, reference IDs, trailing digits, extra whitespace.
 */
export function cleanDescription(raw: string): string {
  return (
    raw
      .toUpperCase()
      // Remove card numbers (last 4 digits patterns)
      .replace(/\b\d{4}\b/g, "")
      // Remove reference/transaction IDs
      .replace(/\b(REF|TXN|TRANS|AUTH|SEQ)[#:\s]*\w+/gi, "")
      // Remove dates embedded in descriptions
      .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Check if a description matches a rule.
 */
function matchRule(description: string, rule: CategoryRule): boolean {
  const upper = description.toUpperCase();
  const pattern = rule.pattern.toUpperCase();

  switch (rule.matchType) {
    case "CONTAINS":
      return upper.includes(pattern);
    case "STARTS_WITH":
      return upper.startsWith(pattern);
    case "REGEX":
      try {
        return new RegExp(rule.pattern, "i").test(description);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

// ─── Keyword Fallback Map ───────────────────────────────────

const KEYWORD_MAP: [string[], string][] = [
  // categoryName -> keywords
  [["RENT", "MORTGAGE", "HOA", "LEASE"], "Housing"],
  [["ELECTRIC", "GAS", "WATER", "INTERNET", "CABLE", "PHONE", "MOBILE"], "Utilities"],
  [["GROCERY", "SUPERMARKET", "MARKET", "FOODS"], "Groceries"],
  [["COFFEE", "CAFE", "BREW"], "Coffee"],
  [["RESTAURANT", "PIZZA", "BURGER", "SUSHI", "TACO", "GRILL", "DINER", "EATERY"], "Dining"],
  [["GAS STATION", "FUEL", "PARKING", "TOLL", "TRANSIT", "METRO", "BUS"], "Transport"],
  [["INSURANCE", "PREMIUM"], "Insurance"],
  [["SUBSCRIPTION", "MEMBERSHIP", "STREAMING"], "Subscriptions"],
  [["AMAZON", "EBAY", "SHOP", "STORE", "MALL", "OUTLET"], "Shopping"],
  [["PHARMACY", "DOCTOR", "MEDICAL", "DENTAL", "HOSPITAL", "HEALTH"], "Healthcare"],
  [["SCHOOL", "TUITION", "COURSE", "UDEMY", "COURSERA"], "Education"],
  [["MOVIE", "THEATER", "CINEMA", "CONCERT", "TICKET", "GAME"], "Entertainment"],
  [["PAYROLL", "SALARY", "WAGE", "DIRECT DEP", "PAY CHECK"], "Salary"],
  [["INTEREST", "DIVIDEND", "YIELD"], "Other Income"],
];

// Keywords that indicate a transfer (not income or expense)
const TRANSFER_KEYWORDS = [
  "TRANSFER", "XFER", "ATM WITHDRAWAL", "ATM DEPOSIT",
  "PAYMENT THANK YOU", "AUTOPAY", "ONLINE PAYMENT",
  "ACH TRANSFER", "WIRE TRANSFER", "ZELLE",
  "VENMO", "CASH APP", // person-to-person could be either, but default to transfer
  "ROBINHOOD", "FIDELITY", "SCHWAB", "VANGUARD", "E*TRADE", "ETRADE",
  "COINBASE", "CRYPTO",
  "SAVINGS", "CHECKING",
  "CREDIT CARD PAYMENT", "CC PAYMENT",
];

/**
 * Detect if a transaction description looks like a transfer between accounts.
 */
export function isTransferDescription(description: string): boolean {
  const upper = description.toUpperCase();
  return TRANSFER_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * Categorize a transaction description using rules.
 *
 * @param description - The raw or cleaned transaction description
 * @param rules - All applicable CategoryRules sorted by priority DESC
 * @param systemCategoryMap - Map of category name -> categoryId for keyword fallback
 */
export function categorize(
  description: string,
  rules: CategoryRule[],
  systemCategoryMap: Record<string, string>
): CategorizeResult {
  const cleaned = cleanDescription(description);

  // Check rules in priority order (already sorted)
  for (const rule of rules) {
    if (matchRule(cleaned, rule)) {
      return { categoryId: rule.categoryId, confidence: 0.9 };
    }
  }

  // Keyword fallback
  for (const [keywords, categoryName] of KEYWORD_MAP) {
    for (const keyword of keywords) {
      if (cleaned.includes(keyword)) {
        const categoryId = systemCategoryMap[categoryName];
        if (categoryId) {
          return { categoryId, confidence: 0.5 };
        }
      }
    }
  }

  // Uncategorized
  const uncategorizedId = systemCategoryMap["Uncategorized"];
  return { categoryId: uncategorizedId || "", confidence: 0 };
}

/**
 * Batch categorize multiple transactions.
 */
export function categorizeBatch(
  descriptions: string[],
  rules: CategoryRule[],
  systemCategoryMap: Record<string, string>
): CategorizeResult[] {
  // Sort rules by priority DESC once
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
  return descriptions.map((desc) => categorize(desc, sortedRules, systemCategoryMap));
}
