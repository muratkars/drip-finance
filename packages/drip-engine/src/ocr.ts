/**
 * OCR Provider abstraction for receipt parsing.
 * Supports local (Tesseract.js) and cloud (Claude Vision) providers.
 *
 * Set OCR_PROVIDER=local (default) or OCR_PROVIDER=claude
 * For Claude: set ANTHROPIC_API_KEY
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptData {
  merchant: string | null;
  date: string | null;
  total: number | null;
  subtotal: number | null;
  tax: number | null;
  items: ReceiptItem[];
  rawText: string;
  confidence: number;
}

export interface OcrProvider {
  extractFromReceipt(imageBuffer: Buffer, mimeType: string): Promise<ReceiptData>;
}

// ─── Tesseract Provider (Local, Zero Cost) ─────────────────

export class TesseractProvider implements OcrProvider {
  async extractFromReceipt(imageBuffer: Buffer, mimeType: string): Promise<ReceiptData> {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng");

    try {
      const { data } = await worker.recognize(imageBuffer);
      const rawText = data.text;
      const confidence = data.confidence / 100;

      return parseReceiptText(rawText, confidence);
    } finally {
      await worker.terminate();
    }
  }
}

// ─── Claude Vision Provider (Cloud, High Accuracy) ─────────

export class ClaudeVisionProvider implements OcrProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractFromReceipt(imageBuffer: Buffer, mimeType: string): Promise<ReceiptData> {
    const base64 = imageBuffer.toString("base64");
    const mediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Extract all data from this receipt. Return JSON only, no markdown:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "items": [{"name": "item", "quantity": 1, "unitPrice": 0.00, "totalPrice": 0.00}]
}
If you can't determine a field, use null. For items, extract as many as you can read.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const result: any = await response.json();
    const text = result.content?.[0]?.text || "";

    try {
      const parsed = JSON.parse(text);
      return {
        merchant: parsed.merchant || null,
        date: parsed.date || null,
        total: parsed.total ?? null,
        subtotal: parsed.subtotal ?? null,
        tax: parsed.tax ?? null,
        items: (parsed.items || []).map((item: any) => ({
          name: item.name || "Unknown item",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.unit_price || 0,
          totalPrice: item.totalPrice || item.total_price || item.unitPrice || 0,
        })),
        rawText: text,
        confidence: 0.95,
      };
    } catch {
      return parseReceiptText(text, 0.7);
    }
  }
}

// ─── Receipt Text Parser (shared by both providers) ────────

function parseReceiptText(rawText: string, confidence: number): ReceiptData {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract merchant (usually first non-empty line or largest text)
  const merchant = lines.length > 0 ? lines[0] : null;

  // Extract date
  let date: string | null = null;
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (dateMatch) {
      date = dateMatch[1];
      break;
    }
  }

  // Extract total
  let total: number | null = null;
  let subtotal: number | null = null;
  let tax: number | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const amountMatch = line.match(/\$?\s*([\d,]+\.\d{2})/);
    if (!amountMatch) continue;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

    if (lower.includes("total") && !lower.includes("sub")) {
      total = amount;
    } else if (lower.includes("subtotal") || lower.includes("sub total")) {
      subtotal = amount;
    } else if (lower.includes("tax")) {
      tax = amount;
    }
  }

  // If no labeled total found, use the largest amount
  if (total === null) {
    const amounts = lines
      .map((l) => l.match(/\$?\s*([\d,]+\.\d{2})/))
      .filter(Boolean)
      .map((m) => parseFloat(m![1].replace(/,/g, "")));
    if (amounts.length > 0) {
      total = Math.max(...amounts);
    }
  }

  // Extract items: lines with a price at the end
  const items: ReceiptItem[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    // Skip total/subtotal/tax lines
    if (lower.includes("total") || lower.includes("tax") || lower.includes("change") || lower.includes("payment")) {
      continue;
    }

    const itemMatch = line.match(/^(.+?)\s+\$?\s*([\d,]+\.\d{2})$/);
    if (itemMatch) {
      const name = itemMatch[1].trim();
      const price = parseFloat(itemMatch[2].replace(/,/g, ""));
      if (name.length > 1 && price > 0 && price < (total || 10000)) {
        // Check for quantity prefix: "2 x Item" or "2x Item"
        const qtyMatch = name.match(/^(\d+)\s*[xX×]\s*(.+)/);
        if (qtyMatch) {
          const qty = parseInt(qtyMatch[1]);
          items.push({
            name: qtyMatch[2].trim(),
            quantity: qty,
            unitPrice: Math.round((price / qty) * 100) / 100,
            totalPrice: price,
          });
        } else {
          items.push({ name, quantity: 1, unitPrice: price, totalPrice: price });
        }
      }
    }
  }

  return {
    merchant,
    date,
    total,
    subtotal,
    tax,
    items,
    rawText,
    confidence,
  };
}

// ─── Factory ────────────────────────────────────────────────

export function createOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER || "local";

  if (provider === "claude") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required when OCR_PROVIDER=claude");
    }
    return new ClaudeVisionProvider(apiKey);
  }

  return new TesseractProvider();
}
