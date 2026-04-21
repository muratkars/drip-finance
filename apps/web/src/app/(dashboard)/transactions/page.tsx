"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { DripIcon } from "@/components/ui/drip-icons";
import {
  DripCard, DripButton, DripSelect, DripLabel, DripCheckbox, Pill,
  Money, CatBadge, fmtDaily, dripInputClass,
} from "@/components/ui/drip-primitives";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { toast } from "sonner";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  dailyAmount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string;
  spreadDays: number;
  source: string;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  fromAccount: { id: string; name: string; type: string; lastFour: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface FinAccount {
  id: string;
  name: string;
  type: string;
  lastFour: string | null;
}

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const accountFromUrl = searchParams.get("account") || "";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ type: "", category: "", account: "" });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setFilter((f) => ({ ...f, account: accountFromUrl }));
    setInitialized(true);
  }, [accountFromUrl]);

  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploadAccountId, setUploadAccountId] = useState("");
  const [committing, setCommitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTx, setNewTx] = useState({
    description: "",
    amount: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
  });

  useEffect(() => {
    if (!initialized) return;
    fetchTransactions();
    fetchCategories();
    fetchAccounts();
  }, [page, filter, initialized]);

  async function fetchAccounts() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts || []);
    }
  }

  async function fetchTransactions() {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(filter.type && { type: filter.type }),
      ...(filter.category && { category: filter.category }),
      ...(filter.account && { account: filter.account }),
    });
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions);
    setTotalPages(data.pagination.totalPages);
  }

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }

  const unassignedCount = transactions.filter((t) => !t.fromAccount).length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAssignAccount(accountId: string) {
    const ids = selectedIds.size > 0
      ? Array.from(selectedIds)
      : transactions.filter((t) => !t.fromAccount).map((t) => t.id);
    if (ids.length === 0) return;
    const res = await fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionIds: ids, accountId }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`${data.updated} transactions assigned`);
      setSelectedIds(new Set());
      fetchTransactions();
    }
  }

  async function updateTransactionAccount(txId: string, accountId: string) {
    const res = await fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionIds: [txId], accountId }),
    });
    if (res.ok) {
      toast.success("Account updated");
      fetchTransactions();
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTx, amount: parseFloat(newTx.amount) }),
    });
    if (res.ok) {
      toast.success("Transaction added");
      setShowAdd(false);
      setNewTx({ description: "", amount: "", type: "EXPENSE", date: new Date().toISOString().split("T")[0], categoryId: "" });
      fetchTransactions();
    } else {
      toast.error("Failed to add transaction");
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Transaction deleted");
    if (expandedId === id) setExpandedId(null);
    fetchTransactions();
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setUploadPreview(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        setUploadPreview(await res.json());
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  async function handleCommitUpload() {
    if (!uploadPreview) return;
    setCommitting(true);
    const nonDuplicates = uploadPreview.preview.filter((tx: any) => !tx.isDuplicate);
    try {
      const res = await fetch("/api/upload/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: nonDuplicates.map((tx: any) => ({
            hash: tx.hash, date: tx.date, description: tx.description,
            amount: tx.amount, type: tx.type, categoryId: tx.categoryId, accountId: uploadAccountId || undefined,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.imported} transactions`);
        setUploadPreview(null);
        setShowUpload(false);
        fetchTransactions();
      }
    } finally {
      setCommitting(false);
    }
  }

  function handleUploadCategoryChange(hash: string, newCategoryId: string) {
    if (!uploadPreview) return;
    const cat = uploadPreview.categories.find((c: any) => c.id === newCategoryId);
    setUploadPreview({
      ...uploadPreview,
      preview: uploadPreview.preview.map((tx: any) =>
        tx.hash === hash ? { ...tx, categoryId: newCategoryId, categoryName: cat?.name || "Uncategorized" } : tx
      ),
    });
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/pdf": [".pdf"] },
    maxFiles: 1,
    noClick: false,
  });

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="drip-eyebrow mb-2" style={{ color: "var(--ink-3)" }}>Ledger</div>
          <h1
            className="font-display m-0"
            style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Transactions
          </h1>
        </div>
        <div className="flex gap-2.5">
          <DripButton
            variant="outline"
            icon="upload"
            onClick={() => { setShowUpload(!showUpload); setShowAdd(false); setUploadPreview(null); }}
          >
            Import
          </DripButton>
          <DripButton
            variant="primary"
            icon="plus"
            onClick={() => { setShowAdd(!showAdd); setShowUpload(false); }}
          >
            Add
          </DripButton>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && !uploadPreview && (
        <DripCard className="mb-4">
          <div className="flex justify-between items-center mb-3.5">
            <div>
              <div className="font-display text-lg" style={{ letterSpacing: "-0.01em" }}>Import transactions</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>Drop a CSV or PDF statement.</div>
            </div>
            <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
              <DripIcon name="x" size={14} />
            </button>
          </div>
          {accounts.length > 0 && (
            <div className="mb-3.5">
              <DripLabel>Which account is this statement from?</DripLabel>
              <div className="mt-1.5">
                <DripSelect
                  value={uploadAccountId}
                  onChange={setUploadAccountId}
                  options={[{ value: "", label: "Choose account..." }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
                />
              </div>
            </div>
          )}
          <div
            {...getRootProps()}
            className="flex flex-col items-center justify-center gap-2 rounded-[10px] p-8 cursor-pointer"
            style={{
              border: `1.5px dashed ${isDragActive ? "var(--accent)" : "var(--line)"}`,
              background: isDragActive ? "color-mix(in oklch, var(--accent) 5%, var(--bg-2))" : "var(--bg-2)",
              color: "var(--ink-3)",
            }}
          >
            <input {...getInputProps()} />
            <DripIcon name="upload" size={24} />
            {uploading ? (
              <div className="text-[13px] font-medium" style={{ color: "var(--ink-2)" }}>Parsing file...</div>
            ) : (
              <>
                <div className="text-[13px] font-medium" style={{ color: "var(--ink-2)" }}>Drop CSV or PDF here</div>
                <div className="text-[11.5px]">or click to browse</div>
              </>
            )}
          </div>
        </DripCard>
      )}

      {/* Upload Preview */}
      {uploadPreview && (
        <DripCard className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
              Preview — {uploadPreview.count - (uploadPreview.duplicateCount || 0)} new
              {uploadPreview.duplicateCount > 0 && `, ${uploadPreview.duplicateCount} duplicate`}
            </div>
            <div className="flex gap-2.5">
              <DripButton variant="outline" onClick={() => { setUploadPreview(null); setShowUpload(false); }}>Cancel</DripButton>
              <DripButton variant="primary" onClick={handleCommitUpload} disabled={committing}>
                {committing ? "Importing..." : `Import ${uploadPreview.count - (uploadPreview.duplicateCount || 0)} transactions`}
              </DripButton>
            </div>
          </div>
          <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            {uploadPreview.preview.map((tx: any, i: number) => (
              <div
                key={`${tx.hash}-${i}`}
                className="grid items-center gap-2.5 px-3.5 py-2.5 text-[12.5px]"
                style={{
                  gridTemplateColumns: "80px 1fr 160px 120px",
                  background: tx.isDuplicate ? "rgba(217,122,60,0.08)" : "transparent",
                  borderTop: i > 0 ? "1px solid var(--line-soft)" : "none",
                  opacity: tx.isDuplicate ? 0.5 : 1,
                }}
              >
                <span className="font-num" style={{ color: "var(--ink-3)" }}>
                  {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span>
                  {tx.description}
                  {tx.isDuplicate && <span className="ml-2 text-[10px]" style={{ color: "#9a501f" }}>(dup)</span>}
                </span>
                <select
                  value={tx.categoryId}
                  onChange={(e) => handleUploadCategoryChange(tx.hash, e.target.value)}
                  disabled={tx.isDuplicate}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  {uploadPreview.categories
                    .filter((c: any) => c.type === tx.type || tx.type === "TRANSFER")
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <span className="text-right font-num">
                  <Money amount={tx.amount} size="sm" signed />
                </span>
              </div>
            ))}
          </div>
        </DripCard>
      )}

      {/* Add form */}
      {showAdd && (
        <DripCard className="mb-4">
          <div className="flex justify-between items-center mb-3.5">
            <div className="font-display text-lg" style={{ letterSpacing: "-0.01em" }}>Add transaction</div>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
              <DripIcon name="x" size={14} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <DripLabel>Description</DripLabel>
              <input value={newTx.description} onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Coffee" className={dripInputClass + " mt-1.5"} required />
            </div>
            <div>
              <DripLabel>Amount</DripLabel>
              <input value={newTx.amount} onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))} type="number" step="0.01" placeholder="0.00" className={dripInputClass + " mt-1.5"} required />
            </div>
            <div>
              <DripLabel>Type</DripLabel>
              <div className="mt-1.5">
                <DripSelect value={newTx.type} onChange={(v) => setNewTx((p) => ({ ...p, type: v as "INCOME" | "EXPENSE" }))} options={[{ value: "EXPENSE", label: "Expense" }, { value: "INCOME", label: "Income" }]} />
              </div>
            </div>
            <div>
              <DripLabel>Date</DripLabel>
              <input value={newTx.date} onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))} type="date" className={dripInputClass + " mt-1.5"} />
            </div>
            <div>
              <DripLabel>Category</DripLabel>
              <div className="mt-1.5">
                <DripSelect
                  value={newTx.categoryId}
                  onChange={(v) => setNewTx((p) => ({ ...p, categoryId: v }))}
                  options={[{ value: "", label: "Category..." }, ...categories.filter((c) => c.type === newTx.type).map((c) => ({ value: c.id, label: c.name }))]}
                />
              </div>
            </div>
            <div className="col-span-2 flex items-end">
              <DripButton variant="primary" type="submit" className="w-full">Save</DripButton>
            </div>
          </form>
        </DripCard>
      )}

      {/* Filter bar */}
      <DripCard padding={0} className="mb-3.5">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <DripIcon name="filter" size={14} style={{ color: "var(--ink-3)" }} />
          <DripSelect
            value={filter.type}
            onChange={(v) => { setFilter((f) => ({ ...f, type: v })); setPage(1); }}
            options={[
              { value: "", label: "All types" },
              { value: "EXPENSE", label: "Expenses" },
              { value: "INCOME", label: "Income" },
              { value: "TRANSFER", label: "Transfers" },
            ]}
          />
          <DripSelect
            value={filter.category}
            onChange={(v) => { setFilter((f) => ({ ...f, category: v })); setPage(1); }}
            options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <DripSelect
            value={filter.account}
            onChange={(v) => { setFilter((f) => ({ ...f, account: v })); setPage(1); }}
            options={[{ value: "", label: "All accounts" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          />
          <div className="ml-auto text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
            {transactions.length} transactions
          </div>
        </div>
      </DripCard>

      {/* Selection banner */}
      {(selectedIds.size > 0 || unassignedCount > 0) && accounts.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-[10px]"
          style={{
            background: "color-mix(in oklch, var(--accent) 10%, var(--card-bg))",
            border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)",
          }}
        >
          <Pill tone="accent">{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${unassignedCount} unassigned`}</Pill>
          <span className="text-[12.5px]" style={{ color: "var(--ink-2)" }}>Assign to</span>
          <DripSelect
            value=""
            onChange={(v) => { if (v) bulkAssignAccount(v); }}
            options={[{ value: "", label: "Choose account..." }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          />
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <DripCard padding={0}>
        <div
          className="grid items-center gap-2 px-4 py-2.5"
          style={{
            gridTemplateColumns: "36px 28px 80px 1fr 150px 120px 100px 60px 36px",
            borderBottom: "1px solid var(--line)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "var(--ink-3)",
            fontWeight: 500,
          }}
        >
          <div></div><div></div><div>Date</div><div>Description</div><div>Category</div>
          <div className="text-right">Amount</div><div className="text-right">Daily</div>
          <div className="text-right">Spread</div><div></div>
        </div>
        {transactions.map((tx, i) => {
          const isIncome = tx.type === "INCOME";
          const isTransfer = tx.type === "TRANSFER";
          const isExpanded = expandedId === tx.id;
          const isSelected = selectedIds.has(tx.id);
          return (
            <div key={tx.id} style={{ borderBottom: (isExpanded || i === transactions.length - 1) ? "none" : "1px solid var(--line-soft)", background: isSelected ? "color-mix(in oklch, var(--accent) 5%, transparent)" : "transparent" }}>
              <div
                className="grid items-center gap-2 px-4 py-3 cursor-pointer"
                style={{ gridTemplateColumns: "36px 28px 80px 1fr 150px 120px 100px 60px 36px" }}
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                <div onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id); }}>
                  <DripCheckbox checked={isSelected} />
                </div>
                <div style={{ color: "var(--ink-3)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 140ms", display: "flex" }}>
                  <DripIcon name="chevron-right" size={12} />
                </div>
                <div className="text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
                  {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{tx.description}</div>
                  {tx.fromAccount && (
                    <div className="text-[10.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                      {tx.fromAccount.name}
                    </div>
                  )}
                </div>
                <div>
                  {tx.category && (
                    <CatBadge name={tx.category.name} icon={tx.category.icon} color={tx.category.color} />
                  )}
                </div>
                <div className="text-right">
                  <Money
                    amount={isIncome ? tx.amount : -tx.amount}
                    size="sm"
                    color={isIncome ? "var(--green)" : isTransfer ? "var(--blue)" : "var(--ink)"}
                    signed
                  />
                </div>
                <div className="text-right text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
                  {fmtDaily(tx.dailyAmount)}
                </div>
                <div className="text-right text-[11.5px] font-num" style={{ color: "var(--ink-3)" }}>
                  {tx.spreadDays}d
                </div>
                <div
                  onClick={(e) => handleDelete(e, tx.id)}
                  className="flex justify-center cursor-pointer p-1"
                  style={{ color: "var(--ink-3)" }}
                >
                  <DripIcon name="trash" size={13} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)", background: "var(--bg-2)" }}>
                  <TransactionDetail
                    transactionId={tx.id}
                    amount={tx.amount}
                    description={tx.description}
                    spreadDays={tx.spreadDays}
                    categories={categories}
                    accounts={accounts}
                    currentAccountId={tx.fromAccount?.id || null}
                    onAccountChange={(accountId) => updateTransactionAccount(tx.id, accountId)}
                    onUpdate={fetchTransactions}
                  />
                </div>
              )}
            </div>
          );
        })}
        {transactions.length === 0 && (
          <div className="p-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>
            No transactions found. Upload a CSV or add one manually.
          </div>
        )}
      </DripCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <DripButton variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </DripButton>
          <span className="text-sm font-num" style={{ color: "var(--ink-3)" }}>
            Page {page} of {totalPages}
          </span>
          <DripButton variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </DripButton>
        </div>
      )}
    </div>
  );
}
