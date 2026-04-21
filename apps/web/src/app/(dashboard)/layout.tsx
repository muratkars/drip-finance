import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar user={session.user} />
      <main
        className="flex-1 overflow-auto page-enter"
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>
    </div>
  );
}
