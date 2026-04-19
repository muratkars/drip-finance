"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Upload,
  Plus,
  Trash2,
  Save,
  Image as ImageIcon,
  FileText,
  X,
  Receipt,
} from "lucide-react";

interface TransactionItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  spreadDays: number;
  dailyAmount: number;
  categoryId?: string;
}

interface ReceiptInfo {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface AccountOption {
  id: string;
  name: string;
  type: string;
  lastFour: string | null;
}

interface TransactionDetailProps {
  transactionId: string;
  amount: number;
  description: string;
  spreadDays: number;
  categories: Category[];
  accounts?: AccountOption[];
  currentAccountId: string | null;
  onAccountChange?: (accountId: string) => void;
  onUpdate: () => void;
}

export function TransactionDetail({
  transactionId,
  amount,
  description,
  spreadDays: currentSpread,
  categories,
  accounts,
  currentAccountId,
  onAccountChange,
  onUpdate,
}: TransactionDetailProps) {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [receipts, setReceipts] = useState<ReceiptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customSpread, setCustomSpread] = useState(currentSpread);

  useEffect(() => {
    fetchDetail();
  }, [transactionId]);

  async function fetchDetail() {
    setLoading(true);
    const res = await fetch(`/api/transactions/${transactionId}`);
    const data = await res.json();
    setItems(data.items || []);
    setReceipts(data.receipts || []);
    setCustomSpread(data.spreadDays);
    setLoading(false);
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: "", quantity: 1, unitPrice: 0, totalPrice: 0, spreadDays: 1, dailyAmount: 0 },
    ]);
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Recalculate derived fields
        if (field === "quantity" || field === "unitPrice") {
          updated.totalPrice = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
        }
        if (field === "quantity" || field === "unitPrice" || field === "spreadDays") {
          const total = updated.quantity * updated.unitPrice;
          updated.totalPrice = Math.round(total * 100) / 100;
          updated.dailyAmount = updated.spreadDays > 0
            ? Math.round((total / updated.spreadDays) * 100) / 100
            : total;
        }
        return updated;
      })
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveItems() {
    setSaving(true);
    if (items.length > 0) {
      await fetch(`/api/transactions/${transactionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            spreadDays: item.spreadDays,
            categoryId: item.categoryId,
          })),
        }),
      });
    } else {
      // No items — update transaction spread directly
      await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadDays: customSpread }),
      });
    }
    setSaving(false);
    onUpdate();
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/transactions/${transactionId}/receipts`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const receipt = await res.json();
          setReceipts((prev) => [receipt, ...prev]);
        }
        setUploading(false);
      }
    },
    [transactionId]
  );

  async function deleteReceipt(receiptId: string) {
    await fetch(`/api/receipts/${receiptId}`, { method: "DELETE" });
    setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
    },
  });

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }

  const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const unallocated = Math.round((amount - itemsTotal) * 100) / 100;

  return (
    <div className="space-y-4 border-t bg-muted/20 p-4">
      {/* Receipt section */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Receipt className="h-4 w-4" /> Receipts
        </h4>

        {receipts.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {receipts.map((r) => (
              <div
                key={r.id}
                className="group flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                {r.fileType.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <button
                  onClick={() => setPreviewUrl(`/api/receipts/${r.id}`)}
                  className="hover:underline"
                >
                  {r.fileName}
                </button>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(r.fileSize / 1024)}KB)
                </span>
                <button
                  onClick={() => deleteReceipt(r.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-md border border-dashed p-3 text-center text-sm transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
          {uploading ? "Uploading..." : "Drop receipt here or click to upload"}
        </div>
      </div>

      {/* Receipt preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-h-[80vh] max-w-[80vw] overflow-auto rounded-lg bg-white p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Receipt" className="max-h-[75vh]" />
          </div>
        </div>
      )}

      {/* Account assignment */}
      {accounts && accounts.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Account</h4>
          <select
            value={currentAccountId || ""}
            onChange={(e) => onAccountChange?.(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">No account assigned</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}{a.lastFour ? ` ····${a.lastFour}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Spread days (when no items) */}
      {items.length === 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Spread Over</h4>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={customSpread}
              onChange={(e) => setCustomSpread(parseInt(e.target.value) || 1)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              days = {formatCurrency(customSpread > 0 ? amount / customSpread : amount)}/day
            </span>
          </div>
        </div>
      )}

      {/* Line items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Line Items
          </h4>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
            <Plus className="h-3 w-3" /> Add Item
          </Button>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_60px_90px_90px_70px_90px_32px] gap-2 text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Total</span>
              <span>Days</span>
              <span>Daily</span>
              <span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_90px_90px_70px_90px_32px] items-center gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  placeholder="Item name"
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.unitPrice || ""}
                  onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                  placeholder="0.00"
                />
                <span className="text-sm">{formatCurrency(item.totalPrice)}</span>
                <Input
                  type="number"
                  min={1}
                  value={item.spreadDays}
                  onChange={(e) => updateItem(i, "spreadDays", parseInt(e.target.value) || 1)}
                  className="h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(item.dailyAmount)}/d
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {unallocated !== 0 && (
              <div className="text-xs text-muted-foreground">
                {unallocated > 0
                  ? `${formatCurrency(unallocated)} unallocated from ${formatCurrency(amount)} total`
                  : `${formatCurrency(Math.abs(unallocated))} over-allocated`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={saveItems} disabled={saving} className="gap-1">
          <Save className="h-3 w-3" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
