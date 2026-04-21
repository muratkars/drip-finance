"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DripIcon, Drop } from "@/components/ui/drip-icons";
import {
  DripCard,
  DripButton,
  DripSelect,
  DripLabel,
  Money,
  SectionHead,
  Pill,
  fmtMoney,
  dripInputClass,
} from "@/components/ui/drip-primitives";

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

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  CHECKING:    { label: "Checking",    icon: "building",  color: "#4F5BD5" },
  SAVINGS:     { label: "Savings",     icon: "piggy",     color: "#2F9E5C" },
  INVESTMENT:  { label: "Investment",  icon: "trendup",   color: "#A85BC4" },
  CASH:        { label: "Cash",        icon: "banknote",  color: "#C49E5B" },
  CREDIT_CARD: { label: "Credit Card", icon: "card",      color: "#C45B7A" },
  LOAN:        { label: "Loan",        icon: "wallet",    color: "#7A6BCB" },
};

const ACCOUNT_COLORS = [
  "#4F5BD5", "#2F9E5C", "#A85BC4", "#C49E5B", "#C45B7A",
  "#7A6BCB", "#0891b2", "#f97316",
];

const PILL_TONE_MAP: Record<string, "blue" | "green" | "purple" | "amber" | "red" | "accent"> = {
  CHECKING:    "blue",
  SAVINGS:     "green",
  INVESTMENT:  "purple",
  CASH:        "amber",
  CREDIT_CARD: "red",
  LOAN:        "accent",
};

function wordCount(n: number): string {
  const w = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  return n <= 12 ? w[n] : String(n);
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
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
    <div style={{ padding: "28px 32px 60px", maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div
            className="drip-eyebrow"
            style={{ color: "var(--ink-3)", marginBottom: 6 }}
          >
            Accounts
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.1, color: "var(--ink)", margin: 0 }}
          >
            {wordCount(accounts.length)} account{accounts.length !== 1 ? "s" : ""},{" "}
            <span className="italic" style={{ color: "var(--ink-3)" }}>one number.</span>
          </h1>
        </div>
        <DripButton icon="plus" onClick={() => setShowAdd(!showAdd)}>
          Add Account
        </DripButton>
      </div>

      {/* ── Net Worth Summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
        {/* Total Assets */}
        <DripCard padding={24}>
          <DripLabel>Total Assets</DripLabel>
          <div style={{ marginTop: 8 }}>
            <Money amount={summary.totalAssets} size="xl" color="#2F9E5C" />
          </div>
        </DripCard>

        {/* Total Liabilities */}
        <DripCard padding={24}>
          <DripLabel>Total Liabilities</DripLabel>
          <div style={{ marginTop: 8 }}>
            <Money amount={summary.totalLiabilities} size="xl" color="#C45B7A" />
          </div>
        </DripCard>

        {/* Net Worth */}
        <DripCard
          padding={24}
          style={{
            borderColor: "var(--accent)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.08, color: "var(--accent)" }}>
            <Drop size={120} filled />
          </div>
          <div style={{ position: "relative" }}>
            <DripLabel>Net Worth</DripLabel>
            <div style={{ marginTop: 8 }}>
              <Money
                amount={summary.netWorth}
                size="xl"
                color={summary.netWorth >= 0 ? "var(--ink)" : "#C45B7A"}
              />
            </div>
          </div>
        </DripCard>
      </div>

      {/* ── Add Account Form ── */}
      {showAdd && (
        <DripCard padding={24} style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h3
              className="font-display"
              style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}
            >
              New Account
            </h3>
          </div>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, alignItems: "end" }}>
            <div>
              <DripLabel>Name</DripLabel>
              <input
                className={dripInputClass}
                placeholder="Account name"
                value={newAccount.name}
                onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
                required
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <DripLabel>Type</DripLabel>
              <div style={{ marginTop: 6 }}>
                <DripSelect
                  value={newAccount.type}
                  onChange={(v) => setNewAccount((p) => ({ ...p, type: v }))}
                  options={Object.entries(TYPE_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <DripLabel>Balance</DripLabel>
              <input
                className={dripInputClass}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newAccount.balance}
                onChange={(e) => setNewAccount((p) => ({ ...p, balance: e.target.value }))}
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <DripLabel>Institution</DripLabel>
              <input
                className={dripInputClass}
                placeholder="Optional"
                value={newAccount.institution}
                onChange={(e) => setNewAccount((p) => ({ ...p, institution: e.target.value }))}
                style={{ marginTop: 6 }}
              />
            </div>
            <DripButton variant="primary" type="submit">
              Add
            </DripButton>
          </form>
        </DripCard>
      )}

      {/* ── Assets ── */}
      {assets.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionHead eyebrow="Holdings" title="Assets" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
                onViewTransactions={() => router.push(`/transactions?account=${acct.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Liabilities ── */}
      {liabilities.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionHead eyebrow="Owed" title="Liabilities" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
                onViewTransactions={() => router.push(`/transactions?account=${acct.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && accounts.length === 0 && !showAdd && (
        <DripCard padding={48} style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "var(--ink-3)" }}>
            <DripIcon name="building" size={48} />
          </div>
          <p
            className="font-display"
            style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 8px" }}
          >
            No accounts yet
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 20px" }}>
            Add your bank accounts, credit cards, and investment accounts to track where your money lives.
          </p>
          <DripButton icon="plus" variant="primary" onClick={() => setShowAdd(true)}>
            Add Your First Account
          </DripButton>
        </DripCard>
      )}
    </div>
  );
}

/* ─── Account Card ─── */
function AccountCard({
  account, editing, editBalance, onEditStart, onEditCancel, onEditSave, onEditChange, onDelete, onViewTransactions,
}: {
  account: FinancialAccount;
  editing: boolean;
  editBalance: string;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditChange: (val: string) => void;
  onDelete: () => void;
  onViewTransactions: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = TYPE_CONFIG[account.type] || TYPE_CONFIG.CHECKING;
  const accentColor = account.color || cfg.color;
  const pillTone = PILL_TONE_MAP[account.type] || "neutral";

  return (
    <DripCard
      padding={20}
      onClick={onViewTransactions}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        transition: "box-shadow 0.2s, border-color 0.2s",
        borderColor: hovered ? "var(--ink-3)" : undefined,
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.08)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Icon */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `color-mix(in oklch, ${accentColor} 14%, transparent)`,
              color: accentColor,
            }}
          >
            <DripIcon name={cfg.icon} size={20} />
          </div>
          {/* Name + institution */}
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
              {account.name}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
              {account.institution || cfg.label}
              {account.lastFour && ` \u00b7\u00b7\u00b7\u00b7${account.lastFour}`}
            </p>
          </div>
        </div>
        {/* Delete button */}
        <DripButton
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}
        >
          <DripIcon name="trash" size={14} style={{ color: "var(--ink-3)" }} />
        </DripButton>
      </div>

      {/* Balance row */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {editing ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className={dripInputClass}
              type="number"
              step="0.01"
              value={editBalance}
              onChange={(e) => onEditChange(e.target.value)}
              style={{ width: 120, height: 32 }}
            />
            <DripButton variant="ghost" size="sm" onClick={onEditSave}>
              <DripIcon name="check" size={14} />
            </DripButton>
            <DripButton variant="ghost" size="sm" onClick={onEditCancel}>
              <DripIcon name="x" size={14} />
            </DripButton>
          </div>
        ) : (
          <>
            <Money
              amount={account.isAsset ? account.balance : -Math.abs(account.balance)}
              size="lg"
              color={account.isAsset ? "var(--ink)" : "#C45B7A"}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Pill tone={pillTone}>{cfg.label}</Pill>
              <DripButton
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onEditStart(); }}
                style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}
              >
                Update
              </DripButton>
            </div>
          </>
        )}
      </div>
    </DripCard>
  );
}
