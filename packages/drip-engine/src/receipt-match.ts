/**
 * Auto-match OCR'd receipt data to existing transactions.
 * Matches by: amount (exact or close), date (within window), merchant name (fuzzy).
 */

import type { ReceiptData } from "./ocr";

interface TransactionCandidate {
  id: string;
  description: string;
  amount: number;
  date: Date;
  hasReceipt: boolean;
}

export interface MatchResult {
  transactionId: string;
  confidence: number;
  matchReasons: string[];
}

/**
 * Find the best matching transaction for a receipt.
 * Returns the match with highest confidence, or null if no good match.
 */
export function matchReceiptToTransaction(
  receipt: ReceiptData,
  candidates: TransactionCandidate[],
  dateWindowDays: number = 3
): MatchResult | null {
  if (!receipt.total && receipt.items.length === 0) return null;

  const scored: (MatchResult & { score: number })[] = [];

  for (const tx of candidates) {
    if (tx.hasReceipt) continue; // already has a receipt

    let score = 0;
    const reasons: string[] = [];

    // Amount match (most important)
    if (receipt.total) {
      const amountDiff = Math.abs(tx.amount - receipt.total);
      if (amountDiff === 0) {
        score += 50;
        reasons.push("Exact amount match");
      } else if (amountDiff < 0.10) {
        score += 40;
        reasons.push("Amount within $0.10");
      } else if (amountDiff < 1.00) {
        score += 20;
        reasons.push("Amount within $1.00");
      } else if (amountDiff / receipt.total < 0.05) {
        score += 10;
        reasons.push("Amount within 5%");
      }
    }

    // Date match
    if (receipt.date) {
      const receiptDate = new Date(receipt.date);
      const daysDiff = Math.abs(
        (tx.date.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 0) {
        score += 30;
        reasons.push("Same date");
      } else if (daysDiff <= 1) {
        score += 25;
        reasons.push("Date within 1 day");
      } else if (daysDiff <= dateWindowDays) {
        score += 15;
        reasons.push(`Date within ${Math.round(daysDiff)} days`);
      }
    }

    // Merchant name match
    if (receipt.merchant) {
      const receiptMerchant = receipt.merchant.toUpperCase();
      const txDesc = tx.description.toUpperCase();

      if (txDesc.includes(receiptMerchant) || receiptMerchant.includes(txDesc)) {
        score += 20;
        reasons.push("Merchant name match");
      } else {
        // Check word-level overlap
        const receiptWords = receiptMerchant.split(/\s+/).filter((w) => w.length > 2);
        const txWords = txDesc.split(/\s+/).filter((w) => w.length > 2);
        const overlap = receiptWords.filter((w) => txWords.some((tw) => tw.includes(w) || w.includes(tw)));
        if (overlap.length > 0) {
          score += 10;
          reasons.push("Partial merchant match");
        }
      }
    }

    if (score >= 40) {
      scored.push({
        transactionId: tx.id,
        confidence: Math.min(1, score / 100),
        matchReasons: reasons,
        score,
      });
    }
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return {
    transactionId: scored[0].transactionId,
    confidence: scored[0].confidence,
    matchReasons: scored[0].matchReasons,
  };
}

/**
 * Find transactions that should have receipts but don't.
 * Prioritized by amount (largest first).
 */
export function findTransactionsNeedingReceipts(
  transactions: TransactionCandidate[],
  minAmount: number = 50,
  maxDaysOld: number = 30
): TransactionCandidate[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDaysOld);

  return transactions
    .filter((tx) => !tx.hasReceipt && tx.amount >= minAmount && tx.date >= cutoff)
    .sort((a, b) => b.amount - a.amount);
}
