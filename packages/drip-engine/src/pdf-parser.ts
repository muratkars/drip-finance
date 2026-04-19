import type { ParsedTransaction } from "./types";

/**
 * Parse a bank statement PDF into transactions.
 * Extracts text from the PDF then identifies transaction lines
 * by looking for date + description + amount patterns.
 */
export async function parsePdf(pdfBuffer: Buffer): Promise<{
  transactions: ParsedTransaction[];
  errors: string[];
}> {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const errors: string[] = [];

  let text: string;
  try {
    const data = await pdfParse(pdfBuffer);
    text = data.text;
  } catch (e: any) {
    return { transactions: [], errors: [`Failed to parse PDF: ${e.message}`] };
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseTransactionLine(line);
    if (parsed) {
      transactions.push(parsed);
    }
  }

  if (transactions.length === 0) {
    errors.push(
      "No transactions found in PDF. The parser looks for lines with a date, description, and dollar amount. " +
      "If this is a scanned PDF (image-based), try uploading a CSV export instead."
    );
  }

  return { transactions, errors };
}

/**
 * Try to extract a transaction from a single line of text.
 * Matches common bank statement patterns:
 *   MM/DD  DESCRIPTION  $1,234.56
 *   MM/DD/YYYY  DESCRIPTION  1234.56
 *   YYYY-MM-DD  DESCRIPTION  -$1,234.56
 */
function parseTransactionLine(line: string): ParsedTransaction | null {
  // Pattern: date at start, amount at end, description in between
  // Date patterns: MM/DD, MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD
  const datePattern = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/;
  const amountPattern = /[($-]*\$?\s*([\d,]+\.\d{2})\)?$/;

  const dateMatch = line.match(datePattern);
  const amountMatch = line.match(amountPattern);

  if (!dateMatch || !amountMatch) return null;

  const dateStr = dateMatch[1];
  const amountStr = amountMatch[1].replace(/,/g, "");
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount === 0) return null;

  // Extract description: everything between date and amount
  const dateEnd = dateMatch.index! + dateMatch[0].length;
  const amountStart = amountMatch.index!;
  const description = line.slice(dateEnd, amountStart).trim();

  if (!description || description.length < 2) return null;

  // Parse date
  const date = parseDate(dateStr);
  if (!date || isNaN(date.getTime())) return null;

  // Determine if income or expense
  // Negative amounts, amounts in parentheses, or lines with "debit"/"withdrawal" = expense
  const isExpense =
    line.includes("(") ||
    line.includes("-$") ||
    line.startsWith("-") ||
    /debit|withdrawal|purchase|payment/i.test(line);

  const isIncome =
    /credit|deposit|direct dep|payroll/i.test(line);

  return {
    date,
    description: cleanDescription(description),
    amount,
    type: isIncome ? "INCOME" : "EXPENSE",
    rawLine: line,
  };
}

function parseDate(str: string): Date {
  // MM/DD or MM/DD/YY or MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const year = y
      ? y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
      : new Date().getFullYear();
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  return new Date(str);
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s*#-]+/, "")
    .trim();
}
