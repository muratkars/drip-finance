import type { SpreadConfig } from "./types";
import { RECURRING_PERIOD_DAYS, CATEGORY_DEFAULT_SPREAD } from "./types";

interface TransactionInput {
  amount: number;
  description: string;
  categoryName: string;
  isRecurring: boolean;
  recurringPeriod?: string | null;
}

/**
 * Compute how many days to spread a transaction over, and the resulting daily amount.
 *
 * Cascade order:
 * 1. Recurring period (if marked recurring)
 * 2. Category-level assumption (user-defined)
 * 3. Item-level assumption (for groceries, matched by description keywords)
 * 4. Category defaults (hardcoded sensible defaults)
 * 5. Fallback: 1 day
 */
export function computeSpread(
  transaction: TransactionInput,
  assumptions: Map<string, number> // key -> value in days
): SpreadConfig {
  // 1. Recurring period
  if (transaction.isRecurring && transaction.recurringPeriod) {
    const days = RECURRING_PERIOD_DAYS[transaction.recurringPeriod];
    if (days) {
      return {
        spreadDays: days,
        dailyAmount: round(transaction.amount / days),
        source: "recurring",
      };
    }
  }

  // 2. Category-level assumption
  const categoryKey = `category_${transaction.categoryName.toLowerCase().replace(/\s+/g, "_")}_spread`;
  const categoryAssumption = assumptions.get(categoryKey);
  if (categoryAssumption) {
    return {
      spreadDays: categoryAssumption,
      dailyAmount: round(transaction.amount / categoryAssumption),
      source: "category_assumption",
    };
  }

  // 3. Item-level assumption (search description for known items)
  const itemDays = matchItemAssumption(transaction.description, assumptions);
  if (itemDays) {
    return {
      spreadDays: itemDays,
      dailyAmount: round(transaction.amount / itemDays),
      source: "item_assumption",
    };
  }

  // 4. Category defaults
  const defaultSpread = CATEGORY_DEFAULT_SPREAD[transaction.categoryName];
  if (defaultSpread && defaultSpread > 1) {
    return {
      spreadDays: defaultSpread,
      dailyAmount: round(transaction.amount / defaultSpread),
      source: "category_default",
    };
  }

  // 5. Fallback: 1 day
  return {
    spreadDays: 1,
    dailyAmount: round(transaction.amount),
    source: "fallback",
  };
}

/**
 * Search transaction description for item-specific assumptions.
 * E.g., if description contains "MILK" and there's an assumption
 * "milk_shelf_life" = 10, return 10.
 */
function matchItemAssumption(description: string, assumptions: Map<string, number>): number | null {
  const upper = description.toUpperCase();

  for (const [key, days] of assumptions) {
    // Keys like "milk_shelf_life", "bread_shelf_life"
    if (key.endsWith("_shelf_life")) {
      const itemName = key.replace("_shelf_life", "").replace(/_/g, " ").toUpperCase();
      if (upper.includes(itemName)) {
        return days;
      }
    }
    // Keys like "tv_lifespan", "phone_lifespan"
    if (key.endsWith("_lifespan")) {
      const itemName = key.replace("_lifespan", "").replace(/_/g, " ").toUpperCase();
      if (upper.includes(itemName)) {
        return days;
      }
    }
  }

  return null;
}

/**
 * Convert assumption value + unit to days.
 */
export function assumptionToDays(value: number, unit: string): number {
  switch (unit) {
    case "DAYS":
      return value;
    case "WEEKS":
      return value * 7;
    case "MONTHS":
      return value * 30;
    case "YEARS":
      return value * 365;
    default:
      return value;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
