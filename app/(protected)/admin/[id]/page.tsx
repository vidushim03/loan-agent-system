import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LoanApplication, UserProfile, ChatMessage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot } from "lucide-react";
import Link from "next/link";

export default async function AdminApplicationDetail({ params }: { params: { id: string } }) {
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

  const { data: appData } = await supabase
    .from("loan_applications")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!appData) redirect("/admin");
  const application = appData as LoanApplication;

  const { data: logsData } = await supabase
    .from("conversation_logs")
    .select("*")
    .eq("application_id", params.id)
    .order("id", { ascending: true });

  const logs = logsData ?? [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Underwriting Review</h1>
          <p className="text-sm text-muted-foreground">
            Review the AI-extracted data against the conversation transcript.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Back to Queue</Link>
          </Button>
          <Button variant="destructive">Reject</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve Loan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Data & Policies */}
        <div className="space-y-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Data</CardTitle>
              <CardDescription>Data collected by the AI Agents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Applicant Name</p>
                  <p className="font-medium">{application.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">PAN Number</p>
                  <p className="font-medium">{application.pan_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Employment</p>
                  <p className="font-medium">{application.employment_type || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Monthly Income</p>
                  <p className="font-medium">INR {application.monthly_income?.toLocaleString() || "0"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Credit Score</p>
                  <p className="font-medium">
                    {application.credit_score || "N/A"} 
                    {application.risk_band && <Badge variant="outline" className="ml-2">{application.risk_band}</Badge>}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Requested Amount</p>
                  <p className="font-medium">INR {application.loan_amount_requested?.toLocaleString() || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Underwriting Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="p-4 rounded-md bg-slate-50 border">
                 <p className="text-sm font-medium mb-2">Stage: <Badge>{application.application_stage}</Badge></p>
                 {application.rejection_reason ? (
                   <p className="text-sm text-red-600 font-medium">Rejection Reason: {application.rejection_reason}</p>
                 ) : (
                   <p className="text-sm text-slate-600">No strict rejection rules triggered by AI.</p>
                 )}
                 {application.failed_rules && application.failed_rules.length > 0 && (
                   <div className="mt-3 text-sm">
                     <p className="font-semibold text-red-600">Failed Policies:</p>
                     <ul className="list-disc pl-5 mt-1 text-slate-700">
                       {application.failed_rules.map((r, i) => <li key={i}>{r}</li>)}
                     </ul>
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Chat Transcript */}
        <Card className="flex flex-col h-full max-h-[800px]">
          <CardHeader className="pb-3 border-b">
            <CardTitle>AI Audit Transcript</CardTitle>
            <CardDescription>Verify what the user said to the AI.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full w-full p-4">
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center mt-4">No conversation logs found.</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex gap-3 text-sm ${log.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm ${log.sender === "user" ? "bg-slate-100" : "bg-primary text-primary-foreground"}`}>
                        {log.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`flex flex-col gap-1 ${log.sender === "user" ? "items-end" : "items-start"}`}>
                        <div className={`rounded-xl px-4 py-2 ${log.sender === "user" ? "bg-slate-100 text-slate-900" : "bg-primary text-primary-foreground"}`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{log.message}</p>
                        </div>
                        {log.metadata?.agent_type && (
                          <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                            AGENT: {log.metadata.agent_type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
