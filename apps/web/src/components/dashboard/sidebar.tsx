"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { DripIcon, Drop } from "@/components/ui/drip-icons";
import { PerDay } from "@/components/ui/drip-primitives";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", id: "dashboard", label: "Dashboard", icon: "grid" },
  { href: "/accounts", id: "accounts", label: "Accounts", icon: "building" },
  { href: "/transactions", id: "transactions", label: "Transactions", icon: "arrows" },
  { href: "/recurring", id: "recurring", label: "Recurring", icon: "calendar" },
  { href: "/goals", id: "goals", label: "Goals", icon: "target" },
  { href: "/reports", id: "reports", label: "Reports", icon: "bar" },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dripData, setDripData] = useState<{ avgDailyExpense: number } | null>(null);

  useEffect(() => {
    fetch("/api/drip?days=7")
      .then((r) => r.json())
      .then((d) => setDripData(d?.summary))
      .catch(() => {});
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const initials = (user.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 lg:hidden" style={{ borderBottom: "1px solid var(--line)", background: "var(--card-bg)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white" style={{ background: "var(--accent)" }}>
            <Drop size={16} />
          </div>
          <span className="font-display text-lg" style={{ letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--accent)" }}>Drip</span> Finance
          </span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-2)" }}>
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          background: "var(--bg-2)",
        }}
      >
        {/* Close button on mobile */}
        <button
          onClick={closeMobile}
          className="absolute top-4 right-4 p-1 lg:hidden"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo lockup — fixed top */}
        <div className="flex items-center gap-2.5 px-[18px] pt-[22px] pb-5 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white"
            style={{
              background: "var(--accent)",
              boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 30%, transparent)",
            }}
          >
            <Drop size={16} />
          </div>
          <div style={{ lineHeight: 1.1 }}>
            <div className="font-display text-lg" style={{ fontWeight: 400, letterSpacing: "-0.02em" }}>
              <span style={{ color: "var(--accent)" }}>Drip</span>{" "}
              <span style={{ color: "var(--ink)" }}>Finance</span>
            </div>
            <div className="italic mt-0.5" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
              know your daily drip
            </div>
          </div>
        </div>

        {/* Nav — scrollable middle section */}
        <nav className="flex flex-col gap-0.5 px-4 flex-1 overflow-y-auto min-h-0">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="flex items-center gap-3 rounded-lg px-2.5 py-[9px] text-[13.5px] font-medium transition-all duration-150"
                style={{
                  letterSpacing: "-0.005em",
                  background: isActive ? "var(--ink)" : "transparent",
                  color: isActive ? "var(--bg)" : "var(--ink-2)",
                  border: "none",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--line-soft)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <DripIcon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section — pinned: drip card + settings + user */}
        <div className="flex-shrink-0 px-4 pb-[18px]">
          {/* Daily drip summary card */}
          <div
            className="mb-3 rounded-xl relative overflow-hidden"
            style={{ padding: 14, background: "var(--ink)", color: "var(--bg)" }}
          >
            <div className="absolute -right-2 -bottom-2 opacity-25" style={{ color: "color-mix(in oklch, var(--accent) 80%, white)" }}>
              <Drop size={60} />
            </div>
            <div className="drip-eyebrow mb-1.5" style={{ opacity: 0.55 }}>
              today&apos;s drip
            </div>
            <PerDay amount={dripData?.avgDailyExpense ?? 0} size="md" color="var(--bg)" />
            <div className="flex items-center gap-1 mt-1.5" style={{ fontSize: 11, opacity: 0.5 }}>
              <DripIcon name="down" size={10} />
              <span className="font-num">2.1%</span>
              <span>vs last week</span>
            </div>
          </div>

          {/* Settings + User */}
          <div className="flex flex-col gap-0.5 pt-2.5" style={{ borderTop: "1px solid var(--line)" }}>
            <Link
              href="/settings"
              onClick={closeMobile}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12.5px] transition-all"
              style={{
                background: pathname === "/settings" ? "var(--line-soft)" : "transparent",
                color: "var(--ink-2)",
                textDecoration: "none",
              }}
            >
              <DripIcon name="settings" size={14} /> Settings
            </Link>

            <div className="flex items-center gap-2.5 px-2.5 pt-2.5 mt-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{ background: "linear-gradient(135deg, #D97A3C, #C45B7A)" }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0" style={{ lineHeight: 1.15 }}>
                <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--ink)" }}>
                  {user.name || "User"}
                </div>
                <div className="text-[10.5px] truncate" style={{ color: "var(--ink-3)" }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="p-1 flex"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
              >
                <DripIcon name="signout" size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
