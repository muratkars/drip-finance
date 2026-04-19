"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload, FileText, Check, X } from "lucide-react";
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

  // Sync URL param to filter state on mount and when URL changes
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

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
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
      body: JSON.stringify({
        ...newTx,
        amount: parseFloat(newTx.amount),
      }),
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

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowUpload(!showUpload); setShowAdd(false); setUploadPreview(null); }} className="gap-2">
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Import</span>
          </Button>
          <Button onClick={() => { setShowAdd(!showAdd); setShowUpload(false); }} className="gap-2">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && !uploadPreview && (
        <Card>
          <CardContent className="pt-6">
            {accounts.length > 0 && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Which account is this statement from?</label>
                <select
                  value={uploadAccountId}
                  onChange={(e) => setUploadAccountId(e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select account (optional)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.lastFour ? ` ····${a.lastFour}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
              {uploading ? (
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Drop CSV or PDF statement here</p>
                  <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Preview */}
      {uploadPreview && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  <FileText className="mr-1 inline h-4 w-4" />
                  {uploadPreview.count} transactions ({uploadPreview.format})
                  {uploadPreview.duplicateCount > 0 && (
                    <span className="ml-2 text-amber-600">{uploadPreview.duplicateCount} duplicates</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setUploadPreview(null); setShowUpload(false); }}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
                <Button size="sm" onClick={handleCommitUpload} disabled={committing} className="gap-1">
                  <Check className="h-3 w-3" />
                  {committing ? "Importing..." : `Import ${uploadPreview.count - (uploadPreview.duplicateCount || 0)}`}
                </Button>
              </div>
            </div>
            <div className="max-h-[300px] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadPreview.preview.map((tx: any, i: number) => (
                    <tr key={`${tx.hash}-${i}`} className={`border-b ${tx.isDuplicate ? "opacity-40" : ""}`}>
                      <td className="p-2 text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="max-w-[200px] truncate p-2 text-xs">
                        {tx.description}
                        {tx.isDuplicate && <span className="ml-1 text-amber-600">(dup)</span>}
                        {tx.isTransfer && <span className="ml-1 text-blue-500">(transfer)</span>}
                      </td>
                      <td className="p-2">
                        <select
                          value={tx.categoryId}
                          onChange={(e) => handleUploadCategoryChange(tx.hash, e.target.value)}
                          className="rounded border bg-background px-1 py-0.5 text-xs"
                          disabled={tx.isDuplicate}
                        >
                          {uploadPreview.categories
                            .filter((c: any) => c.type === tx.type || tx.type === "TRANSFER")
                            .map((c: any) => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                      </td>
                      <td className="p-2 text-right text-xs font-medium">{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showAdd && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Input
                placeholder="Description"
                value={newTx.description}
                onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))}
                className="lg:col-span-2"
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={newTx.amount}
                onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <select
                value={newTx.type}
                onChange={(e) => setNewTx((p) => ({ ...p, type: e.target.value as "INCOME" | "EXPENSE" }))}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
              <Input
                type="date"
                value={newTx.date}
                onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))}
              />
              <select
                value={newTx.categoryId}
                onChange={(e) => setNewTx((p) => ({ ...p, categoryId: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Category...</option>
                {categories
                  .filter((c) => c.type === newTx.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
              </select>
              <Button type="submit" className="sm:col-span-2 lg:col-span-6">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Selection / assignment bar */}
      {accounts.length > 0 && (selectedIds.size > 0 || unassignedCount > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800/30 dark:bg-blue-950/10">
          {selectedIds.size > 0 ? (
            <>
              <span className="font-medium text-blue-800 dark:text-blue-400">
                {selectedIds.size} selected
              </span>
              <span className="text-muted-foreground">Assign to:</span>
            </>
          ) : (
            <>
              <span className="text-amber-800 dark:text-amber-400">
                {unassignedCount} without account
              </span>
              <span className="text-muted-foreground">Assign all to:</span>
            </>
          )}
          <select
            onChange={(e) => { if (e.target.value) bulkAssignAccount(e.target.value); e.target.value = ""; }}
            className="rounded-md border bg-background px-2 py-1 text-sm"
            defaultValue=""
          >
            <option value="" disabled>Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.lastFour ? ` ····${a.lastFour}` : ""}</option>
            ))}
          </select>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs">
              Clear selection
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={filter.type}
          onChange={(e) => { setFilter((f) => ({ ...f, type: e.target.value })); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="EXPENSE">Expenses</option>
          <option value="INCOME">Income</option>
          <option value="TRANSFER">Transfers</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => { setFilter((f) => ({ ...f, category: e.target.value })); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={filter.account}
          onChange={(e) => { setFilter((f) => ({ ...f, account: e.target.value })); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{a.lastFour ? ` ····${a.lastFour}` : ""}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="w-8 p-3 sm:p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === transactions.length && transactions.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th className="w-8 p-3 sm:p-4"></th>
                <th className="hidden p-3 sm:table-cell sm:p-4">Date</th>
                <th className="p-3 sm:p-4">Description</th>
                <th className="hidden p-3 md:table-cell sm:p-4">Category</th>
                <th className="p-3 text-right sm:p-4">Amount</th>
                <th className="hidden p-3 text-right lg:table-cell sm:p-4">Daily</th>
                <th className="hidden p-3 text-right lg:table-cell sm:p-4">Spread</th>
                <th className="p-3 sm:p-4"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <>
                  <tr
                    key={tx.id}
                    className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${expandedId === tx.id ? "bg-muted/30" : ""} ${selectedIds.has(tx.id) ? "bg-blue-50 dark:bg-blue-950/10" : ""}`}
                    onClick={() => toggleExpand(tx.id)}
                  >
                    <td className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id, { stopPropagation: () => {} } as any)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      {expandedId === tx.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="hidden p-3 text-sm sm:table-cell sm:p-4">{formatDate(tx.date)}</td>
                    <td className="p-3 text-sm font-medium sm:p-4">
                      <div className="flex items-center gap-2">
                        <span>{tx.description}</span>
                        {tx.fromAccount && (
                          <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground lg:inline">
                            {tx.fromAccount.name}{tx.fromAccount.lastFour ? ` ····${tx.fromAccount.lastFour}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
                        <span>{formatDate(tx.date)}</span>
                        {tx.fromAccount && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                            {tx.fromAccount.name}
                          </span>
                        )}
                        {tx.category && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            {tx.category.icon} {tx.category.name}
                          </Badge>
                        )}
                        {tx.spreadDays > 1 && (
                          <span>{formatCurrency(tx.dailyAmount)}/d &middot; {tx.spreadDays}d</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden p-3 md:table-cell sm:p-4">
                      {tx.category && (
                        <Badge variant="secondary" className="gap-1">
                          {tx.category.icon} {tx.category.name}
                        </Badge>
                      )}
                    </td>
                    <td className={`p-3 text-right text-sm font-semibold sm:p-4 ${tx.type === "INCOME" ? "text-green-600" : tx.type === "TRANSFER" ? "text-blue-500" : ""}`}>
                      {tx.type === "INCOME" ? "+" : tx.type === "TRANSFER" ? "" : "-"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="hidden p-3 text-right text-sm text-muted-foreground lg:table-cell sm:p-4">
                      {formatCurrency(tx.dailyAmount)}/d
                    </td>
                    <td className="hidden p-3 text-right text-sm text-muted-foreground lg:table-cell sm:p-4">
                      {tx.spreadDays}d
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, tx.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                  {expandedId === tx.id && (
                    <tr key={`${tx.id}-detail`}>
                      <td colSpan={9}>
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
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No transactions found. Upload a CSV or add one manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
