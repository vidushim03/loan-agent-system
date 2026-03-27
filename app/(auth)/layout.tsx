import { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl grid-cols-1 items-center gap-10 px-6 py-10 md:grid-cols-2">
        <section className="space-y-4">
          <Link href="/" className="text-sm font-semibold text-slate-700 hover:underline">
            Back to home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900">Welcome to FinAssist</h1>
          <p className="text-slate-600">
            Securely manage AI-assisted loan applications with KYC, credit checks, underwriting decisions, and sanction letter generation.
          </p>
        </section>

        <section>{children}</section>
      </div>
    </div>
  );
}
