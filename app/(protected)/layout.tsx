"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import DarkModeToggle from "@/components/ui/DarkModeToggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/chat", label: "Chat Assistant" },
  { href: "/applications", label: "Applications" },
  { href: "/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
];

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <aside className="hidden w-64 border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground shadow-sm md:block">
        <h1 className="mb-8 text-2xl font-bold text-sidebar-primary">FinAssist</h1>

        <nav className="flex flex-col space-y-2 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary",
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-sidebar-border pt-6 text-xs text-muted-foreground">FinAssist workspace</div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold">Loan Operations Workspace</h2>
            <nav className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground md:hidden">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className={pathname === item.href ? "text-foreground" : undefined}>
                  {item.label.replace(" Assistant", "")}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Logged in</span>
            <DarkModeToggle />
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <section className="flex-1 overflow-y-auto bg-background p-3 sm:p-6">{children}</section>

          <aside className="hidden w-[360px] overflow-y-auto border-l border-border bg-card p-6 xl:block">
            <h3 className="mb-4 text-lg font-semibold text-primary">Workspace Notes</h3>

            <Card className="mb-4 border border-border p-4 shadow-sm">
              <h4 className="mb-1 font-medium">Application Flow</h4>
              <p className="text-sm text-muted-foreground">
                New cases start in chat, move into applications, then finish through documents and sanction letter generation.
              </p>
            </Card>

            <Card className="mb-4 border border-border p-4 shadow-sm">
              <h4 className="mb-1 font-medium">Reviewer Queue</h4>
              <p className="text-sm text-muted-foreground">
                Reviewer and admin users can verify or reject uploaded documents directly from the applications workspace.
              </p>
            </Card>

            <Card className="border border-border p-4 shadow-sm">
              <h4 className="mb-1 font-medium">Data Source</h4>
              <p className="text-sm text-muted-foreground">
                Live Supabase data is used first, with seeded records available for demo and interview-friendly testing.
              </p>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}
