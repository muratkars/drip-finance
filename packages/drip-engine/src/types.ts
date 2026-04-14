export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  rawLine: string;
}

export interface CsvFormat {
  name: string;
  detectHeader: (headers: string[]) => boolean;
  parseRow: (row: Record<string, string>) => ParsedTransaction | null;
}

export interface CategorizeResult {
  categoryId: string;
  confidence: number;
}

export interface SpreadConfig {
  spreadDays: number;
  dailyAmount: number;
  source: "recurring" | "category_assumption" | "item_assumption" | "category_default" | "fallback";
}

export const RECURRING_PERIOD_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
  QUARTERLY: 91,
  YEARLY: 365,
};

export const CATEGORY_DEFAULT_SPREAD: Record<string, number> = {
  Housing: 30,
  Utilities: 30,
  Groceries: 7,
  Coffee: 1,
  Dining: 1,
  Transport: 1,
  Insurance: 30,
  Subscriptions: 30,
  Shopping: 1,
  Healthcare: 1,
  Education: 30,
  Entertainment: 1,
  Salary: 14,
  Freelance: 1,
  Investments: 1,
  "Other Income": 1,
  Uncategorized: 1,
};
