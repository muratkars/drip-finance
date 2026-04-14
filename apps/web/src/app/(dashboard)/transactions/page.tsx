"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Receipt, Paperclip } from "lucide-react";
import { TransactionDetail } from "@/components/transactions/transaction-detail";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  dailyAmount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  spreadDays: number;
  source: string;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ type: "", category: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTx, setNewTx] = useState({
    description: "",
    amount: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [page, filter]);

  async function fetchTransactions() {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(filter.type && { type: filter.type }),
      ...(filter.category && { category: filter.category }),
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newTx,
        amount: parseFloat(newTx.amount),
      }),
    });
    setShowAdd(false);
    setNewTx({ description: "", amount: "", type: "EXPENSE", date: new Date().toISOString().split("T")[0], categoryId: "" });
    fetchTransactions();
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (expandedId === id) setExpandedId(null);
    fetchTransactions();
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
              <Input
                placeholder="Description"
                value={newTx.description}
                onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))}
                className="w-48"
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={newTx.amount}
                onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))}
                className="w-32"
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
                className="w-40"
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
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <select
          value={filter.type}
          onChange={(e) => { setFilter((f) => ({ ...f, type: e.target.value })); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="EXPENSE">Expenses</option>
          <option value="INCOME">Income</option>
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
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="w-8 p-4"></th>
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Daily</th>
                <th className="p-4 text-right">Spread</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <>
                  <tr
                    key={tx.id}
                    className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${expandedId === tx.id ? "bg-muted/30" : ""}`}
                    onClick={() => toggleExpand(tx.id)}
                  >
                    <td className="p-4">
                      {expandedId === tx.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-4 text-sm">{formatDate(tx.date)}</td>
                    <td className="p-4 text-sm font-medium">{tx.description}</td>
                    <td className="p-4">
                      {tx.category && (
                        <Badge variant="secondary" className="gap-1">
                          {tx.category.icon} {tx.category.name}
                        </Badge>
                      )}
                    </td>
                    <td className={`p-4 text-right text-sm font-semibold ${tx.type === "INCOME" ? "text-green-600" : ""}`}>
                      {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4 text-right text-sm text-muted-foreground">
                      {formatCurrency(tx.dailyAmount)}/d
                    </td>
                    <td className="p-4 text-right text-sm text-muted-foreground">
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
                      <td colSpan={8}>
                        <TransactionDetail
                          transactionId={tx.id}
                          amount={tx.amount}
                          description={tx.description}
                          spreadDays={tx.spreadDays}
                          categories={categories}
                          onUpdate={fetchTransactions}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No transactions found. Upload a CSV or add one manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
