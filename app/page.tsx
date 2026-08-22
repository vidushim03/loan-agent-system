import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14">
        <section className="space-y-5">
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Instant Approval
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            FinAssist: Get Your Personal Loan in Minutes
          </h1>
          <p className="max-w-2xl text-slate-600">
            Chat with our intelligent AI assistant to verify your identity, assess your credit, and get instant loan approval without filling out endless forms.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create account</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/chat">Chat with AI Agent</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 mt-8">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">1. Chat with AI</h3>
            <p className="text-slate-600 text-sm">Have a natural conversation to share your details. No complex forms required.</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">2. Instant Verification</h3>
            <p className="text-slate-600 text-sm">Our system automatically verifies your KYC and fetches your credit profile.</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">3. Get Funded</h3>
            <p className="text-slate-600 text-sm">Receive a customized loan offer and instantly see your approved EMI and interest rate.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
