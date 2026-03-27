"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import DarkModeToggle from "@/components/ui/DarkModeToggle";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <aside className="hidden w-64 border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground shadow-sm md:block">
        <h1 className="mb-8 text-2xl font-bold text-sidebar-primary">FinAssist</h1>

        <nav className="flex flex-col space-y-4 text-sm font-medium">
          <Link href="/chat" className="transition-colors hover:text-sidebar-primary">Chat Assistant</Link>
          <Link href="/applications" className="transition-colors hover:text-sidebar-primary">Applications</Link>
          <Link href="/chat" className="transition-colors hover:text-sidebar-primary">Documents</Link>
          <Link href="/chat" className="transition-colors hover:text-sidebar-primary">Settings</Link>
        </nav>

        <div className="mt-8 border-t border-sidebar-border pt-6 text-xs text-muted-foreground">(c) 2026 FinAssist AI</div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold">Loan Sales Assistant Dashboard</h2>
            <nav className="mt-1 flex items-center gap-3 text-xs text-muted-foreground md:hidden">
              <Link href="/chat">Chat</Link>
              <Link href="/applications">Applications</Link>
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
            <h3 className="mb-4 text-lg font-semibold text-primary">Loan Summary</h3>

            <Card className="mb-4 border border-border p-4 shadow-sm">
              <h4 className="mb-1 font-medium">Total Applications</h4>
              <p className="text-2xl font-bold text-primary">42</p>
              <p className="text-sm text-muted-foreground">+12% from last month</p>
            </Card>

            <Card className="mb-4 border border-border p-4 shadow-sm">
              <h4 className="mb-1 font-medium">Average Loan Amount</h4>
              <p className="text-2xl font-bold text-primary">INR 5.8L</p>
              <p className="text-sm text-muted-foreground">+5% this quarter</p>
            </Card>

            <Card className="border border-border p-4 shadow-sm">
              <h4 className="mb-1 font-medium">Approval Rate</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">78%</p>
              <p className="text-sm text-muted-foreground">steady growth</p>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}
