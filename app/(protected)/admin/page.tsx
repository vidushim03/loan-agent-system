import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { LoanApplication, UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>();

  if (profile?.role !== "reviewer" && profile?.role !== "admin") {
    redirect("/applications");
  }

  const { data: applicationsData } = await supabase
    .from("loan_applications")
    .select("id, full_name, pan_number, loan_amount_requested, approval_status, application_stage, created_at, credit_score, risk_band")
    .in("approval_status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
    .returns<LoanApplication[]>();

  const applications = applicationsData ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Underwriter Queue (HITL)</h1>
        <p className="text-sm text-muted-foreground">
          Human-in-the-loop review queue for AI-processed loan applications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>Review and finalize underwriting decisions proposed by the AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center p-6 text-sm text-slate-500 border border-dashed rounded-md">
              No pending applications require human review at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-3 font-medium">Applicant</th>
                    <th className="py-3 font-medium">Requested</th>
                    <th className="py-3 font-medium">Credit Score</th>
                    <th className="py-3 font-medium">AI Stage</th>
                    <th className="py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-slate-900">{app.full_name || "Unknown"}</div>
                        <div className="text-xs text-slate-500">PAN: {app.pan_number || "N/A"}</div>
                      </td>
                      <td className="py-3">
                        INR {app.loan_amount_requested?.toLocaleString() ?? 0}
                      </td>
                      <td className="py-3">
                        {app.credit_score ? (
                          <Badge variant="outline">{app.credit_score} ({app.risk_band || "Unknown"})</Badge>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="capitalize">
                          {app.application_stage?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button asChild size="sm">
                          <Link href={`/admin/${app.id}`}>
                            Review Case
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
