import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

function yesNo(value: boolean) {
  return value ? "Configured" : "Missing";
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, role, organization, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account details, workspace role, and local environment readiness for this loan operations app.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p><span className="font-medium text-slate-900">Email:</span> {user.email}</p>
            <p><span className="font-medium text-slate-900">Name:</span> {profile?.full_name ?? "Not set"}</p>
            <p><span className="font-medium text-slate-900">Role:</span> {profile?.role ?? "customer"}</p>
            <p><span className="font-medium text-slate-900">Organization:</span> {profile?.organization ?? "Not set"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p><span className="font-medium text-slate-900">Supabase URL:</span> {yesNo(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))}</p>
            <p><span className="font-medium text-slate-900">Supabase anon key:</span> {yesNo(Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))}</p>
            <p><span className="font-medium text-slate-900">Service role key:</span> {yesNo(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))}</p>
            <p><span className="font-medium text-slate-900">Groq API key:</span> {yesNo(Boolean(process.env.GROQ_API_KEY))}</p>
            <p><span className="font-medium text-slate-900">App URL:</span> {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
