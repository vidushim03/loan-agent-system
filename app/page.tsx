import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14">
        <section className="space-y-5">
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Loan AI Demo
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            FinAssist: Multi-Agent Loan Underwriting System
          </h1>
          <p className="max-w-2xl text-slate-600">
            A production-style Next.js app that verifies KYC, checks credit, applies underwriting rules, and generates sanction-letter PDFs through a conversational assistant.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create account</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/chat">Open demo chat</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>What it demonstrates</CardTitle>
              <CardDescription>Resume-ready full-stack workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>- Conversational data collection and stateful chat orchestration</p>
              <p>- KYC and credit checks via dedicated worker agents</p>
              <p>- Rule-based underwriting with approval and rejection reasons</p>
              <p>- PDF sanction letter generation API</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tech stack</CardTitle>
              <CardDescription>Modern app architecture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>- Next.js App Router + TypeScript</p>
              <p>- Supabase (Auth + Postgres)</p>
              <p>- Groq SDK for LLM utility endpoints</p>
              <p>- Tailwind + shadcn/ui components</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
