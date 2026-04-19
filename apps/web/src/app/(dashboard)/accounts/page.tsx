"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Check, X, Wallet, CreditCard,
  PiggyBank, TrendingUp, Banknote, Landmark,
} from "lucide-react";

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution: string | null;
  lastFour: string | null;
  color: string | null;
  isActive: boolean;
  isAsset: boolean;
}

interface Summary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  CHECKING: { label: "Checking", icon: Landmark, color: "#3b82f6" },
  SAVINGS: { label: "Savings", icon: PiggyBank, color: "#22c55e" },
  CREDIT_CARD: { label: "Credit Card", icon: CreditCard, color: "#ef4444" },
  INVESTMENT: { label: "Investment", icon: TrendingUp, color: "#8b5cf6" },
  CASH: { label: "Cash", icon: Banknote, color: "#f59e0b" },
  LOAN: { label: "Loan", icon: Wallet, color: "#dc2626" },
};

const ACCOUNT_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#f59e0b",
  "#ec4899", "#0891b2", "#f97316",
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [loading, setLoading] = useState(true);
  const [newAccount, setNewAccount] = useState({
    name: "", type: "CHECKING", balance: "", institution: "", lastFour: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setSummary(data.summary || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newAccount,
        balance: parseFloat(newAccount.balance) || 0,
        color: ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length],
      }),
    });
    if (res.ok) {
      toast.success("Account added");
      setNewAccount({ name: "", type: "CHECKING", balance: "", institution: "", lastFour: "" });
      setShowAdd(false);
      fetchAccounts();
    } else {
      toast.error("Failed to add account");
    }
  }

  async function updateBalance(id: string) {
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, balance: parseFloat(editBalance) || 0 }),
    });
    if (res.ok) toast.success("Balance updated");
    setEditingId(null);
    fetchAccounts();
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    fetchAccounts();
  }

  const assets = accounts.filter((a) => a.isAsset && a.isActive);
  const liabilities = accounts.filter((a) => !a.isAsset && a.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Accounts</h1>
          <p className="text-sm text-muted-foreground">{accounts.length} accounts linked</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2 self-start">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Net Worth Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Assets</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(summary.totalAssets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Liabilities</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(summary.totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Worth</p>
            <p className={`mt-1 text-2xl font-bold ${summary.netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.netWorth)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Account Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                placeholder="Account name"
                value={newAccount.name}
                onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <select
                value={newAccount.type}
                onChange={(e) => setNewAccount((p) => ({ ...p, type: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <Input
                type="number"
                step="0.01"
                placeholder="Current balance"
                value={newAccount.balance}
                onChange={(e) => setNewAccount((p) => ({ ...p, balance: e.target.value }))}
              />
              <Input
                placeholder="Institution (optional)"
                value={newAccount.institution}
                onChange={(e) => setNewAccount((p) => ({ ...p, institution: e.target.value }))}
              />
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assets */}
      {assets.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Assets</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((acct) => (
              <AccountCard
                key={acct.id}
                account={acct}
                editing={editingId === acct.id}
                editBalance={editBalance}
                onEditStart={() => { setEditingId(acct.id); setEditBalance(String(acct.balance)); }}
                onEditCancel={() => setEditingId(null)}
                onEditSave={() => updateBalance(acct.id)}
                onEditChange={setEditBalance}
                onDelete={() => deleteAccount(acct.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Liabilities */}
      {liabilities.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Liabilities</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liabilities.map((acct) => (
              <AccountCard
                key={acct.id}
                account={acct}
                editing={editingId === acct.id}
                editBalance={editBalance}
                onEditStart={() => { setEditingId(acct.id); setEditBalance(String(acct.balance)); }}
                onEditCancel={() => setEditingId(null)}
                onEditSave={() => updateBalance(acct.id)}
                onEditChange={setEditBalance}
                onDelete={() => deleteAccount(acct.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && accounts.length === 0 && !showAdd && (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No accounts yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your bank accounts, credit cards, and investment accounts to track where your money lives.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AccountCard({
  account, editing, editBalance, onEditStart, onEditCancel, onEditSave, onEditChange, onDelete,
}: {
  account: FinancialAccount;
  editing: boolean;
  editBalance: string;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditChange: (val: string) => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[account.type] || TYPE_CONFIG.CHECKING;
  const Icon = cfg.icon;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${account.color || cfg.color}20`, color: account.color || cfg.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-xs text-muted-foreground">
                {cfg.label}
                {account.institution && ` · ${account.institution}`}
                {account.lastFour && ` ····${account.lastFour}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>

        <div className="mt-4">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={editBalance}
                onChange={(e) => onEditChange(e.target.value)}
                className="h-8 w-32"
              />
              <Button size="sm" variant="ghost" onClick={onEditSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onEditCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className={`text-xl font-bold ${account.isAsset ? "" : "text-red-600"}`}>
                {account.isAsset ? "" : "-"}{formatCurrency(Math.abs(account.balance))}
              </p>
              <Button size="sm" variant="ghost" onClick={onEditStart} className="gap-1">
                <Edit2 className="h-3 w-3" /> Update
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
