import Papa from "papaparse";
import type { ParsedTransaction, CsvFormat } from "./types";

/**
 * Clean and normalize a raw amount string to a number.
 * Handles: "$1,234.56", "(123.45)", "-123.45", "1234.56"
 */
function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,\s]/g, "");
  // Parentheses mean negative (accounting format)
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    return -parseFloat(cleaned.slice(1, -1));
  }
  return parseFloat(cleaned);
}

function parseDate(raw: string): Date {
  // Try common date formats
  const cleaned = raw.trim();

  // MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // Fallback to native parser
  return new Date(cleaned);
}

// ─── Format Detectors ───────────────────────────────────────

const genericFormat: CsvFormat = {
  name: "Generic",
  detectHeader: (headers) => {
    const lower = headers.map((h) => h.toLowerCase().trim());
    return lower.includes("date") && lower.includes("description") && lower.includes("amount");
  },
  parseRow: (row) => {
    const keys = Object.keys(row);
    const findKey = (names: string[]) =>
      keys.find((k) => names.includes(k.toLowerCase().trim())) || "";

    const dateKey = findKey(["date", "transaction date", "trans date", "posted date"]);
    const descKey = findKey(["description", "memo", "payee", "name", "merchant"]);
    const amountKey = findKey(["amount", "transaction amount"]);

    if (!row[dateKey] || !row[descKey]) return null;

    const amount = parseAmount(row[amountKey]);
    if (isNaN(amount)) return null;

    return {
      date: parseDate(row[dateKey]),
      description: row[descKey].trim(),
      amount: Math.abs(amount),
      type: amount >= 0 ? "INCOME" : "EXPENSE",
      rawLine: JSON.stringify(row),
    };
  },
};

const chaseFormat: CsvFormat = {
  name: "Chase",
  detectHeader: (headers) => {
    const lower = headers.map((h) => h.toLowerCase().trim());
    return (
      lower.includes("transaction date") &&
      lower.includes("description") &&
      lower.includes("amount")
    );
  },
  parseRow: (row) => {
    const date = row["Transaction Date"] || row["transaction date"];
    const desc = row["Description"] || row["description"];
    const amount = parseAmount(row["Amount"] || row["amount"] || "0");

    if (!date || !desc || isNaN(amount)) return null;

    // Chase: negative = expense, positive = income/refund
    return {
      date: parseDate(date),
      description: desc.trim(),
      amount: Math.abs(amount),
      type: amount < 0 ? "EXPENSE" : "INCOME",
      rawLine: JSON.stringify(row),
    };
  },
};

const debitCreditFormat: CsvFormat = {
  name: "Debit/Credit Columns",
  detectHeader: (headers) => {
    const lower = headers.map((h) => h.toLowerCase().trim());
    return (
      lower.includes("date") &&
      (lower.includes("debit") || lower.includes("withdrawal")) &&
      (lower.includes("credit") || lower.includes("deposit"))
    );
  },
  parseRow: (row) => {
    const keys = Object.keys(row);
    const findKey = (names: string[]) =>
      keys.find((k) => names.includes(k.toLowerCase().trim())) || "";

    const dateKey = findKey(["date", "transaction date"]);
    const descKey = findKey(["description", "memo", "payee", "name"]);
    const debitKey = findKey(["debit", "withdrawal"]);
    const creditKey = findKey(["credit", "deposit"]);

    if (!row[dateKey]) return null;

    const debit = parseAmount(row[debitKey] || "0");
    const credit = parseAmount(row[creditKey] || "0");

    const isExpense = debit > 0;
    const amount = isExpense ? debit : credit;

    if (amount === 0) return null;

    return {
      date: parseDate(row[dateKey]),
      description: (row[descKey] || "").trim(),
      amount,
      type: isExpense ? "EXPENSE" : "INCOME",
      rawLine: JSON.stringify(row),
    };
  },
};

const FORMATS: CsvFormat[] = [chaseFormat, debitCreditFormat, genericFormat];

/**
 * Parse a CSV string into normalized transactions.
 * Auto-detects the CSV format from the header row.
 */
export function parseCsv(csvContent: string): {
  transactions: ParsedTransaction[];
  format: string;
  errors: string[];
} {
  const errors: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  if (parsed.data.length === 0) {
    return { transactions: [], format: "Unknown", errors: ["No data found in CSV"] };
  }

  // Detect format
  const headers = parsed.meta.fields || [];
  const format = FORMATS.find((f) => f.detectHeader(headers));

  if (!format) {
    return {
      transactions: [],
      format: "Unknown",
      errors: [
        `Could not detect CSV format. Found columns: ${headers.join(", ")}. ` +
          `Expected: date + description + amount columns.`,
      ],
    };
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    try {
      const tx = format.parseRow(row);
      if (tx) {
        transactions.push(tx);
      }
    } catch (e) {
      errors.push(`Row ${i + 1}: Failed to parse - ${e}`);
    }
  }

  return { transactions, format: format.name, errors };
}

/**
 * Generate a hash for duplicate detection.
 */
export function transactionHash(tx: ParsedTransaction): string {
  const dateStr = tx.date.toISOString().split("T")[0];
  const key = `${dateStr}|${tx.description}|${tx.amount}|${tx.type}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
