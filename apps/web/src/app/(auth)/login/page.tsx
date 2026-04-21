"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Drop } from "@/components/ui/drip-icons";
import { DripCard, DripButton, DripLabel, dripInputClass } from "@/components/ui/drip-primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden"
      style={{ background: "var(--bg-2)" }}
    >
      {/* Decorative drops */}
      <div className="absolute -top-20 -right-20 opacity-[0.08]" style={{ color: "var(--accent)" }}>
        <Drop size={400} />
      </div>
      <div className="absolute -bottom-[120px] -left-10 opacity-[0.05]" style={{ color: "var(--accent)" }}>
        <Drop size={280} />
      </div>

      <DripCard className="w-full max-w-[400px] z-10" padding={36} style={{ boxShadow: "0 10px 40px rgba(14,17,22,0.06)" }}>
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-3 mb-2.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
              style={{ background: "var(--accent)" }}
            >
              <Drop size={22} />
            </div>
            <div className="font-display text-[32px]" style={{ fontWeight: 400, letterSpacing: "-0.025em" }}>
              <span style={{ color: "var(--accent)" }}>Drip</span> Finance
            </div>
          </div>
          <div className="text-[13px] italic mt-1.5" style={{ color: "var(--ink-3)" }}>
            Welcome back. Let&apos;s see today&apos;s drip.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {error && (
            <div
              className="rounded-lg p-3 text-sm"
              style={{ background: "rgba(196,91,122,0.1)", color: "#9a3858" }}
            >
              {error}
            </div>
          )}
          <div>
            <DripLabel>Email</DripLabel>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={dripInputClass + " mt-1.5 h-10"}
              required
            />
          </div>
          <div>
            <DripLabel>Password</DripLabel>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={dripInputClass + " mt-1.5 h-10"}
              required
            />
          </div>
          <DripButton
            variant="accent"
            size="lg"
            type="submit"
            disabled={loading}
            className="w-full mt-1.5"
          >
            {loading ? "Signing in..." : "Sign in"}
          </DripButton>
          <div className="text-center text-[12.5px] mt-2" style={{ color: "var(--ink-3)" }}>
            New here?{" "}
            <Link href="/register" className="font-medium" style={{ color: "var(--accent)", textDecoration: "none" }}>
              Create an account
            </Link>
          </div>
        </form>
      </DripCard>
    </div>
  );
}
