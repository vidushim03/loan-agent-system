import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationDocument, UserProfile } from "@/types";

function titleize(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusTone(status: ApplicationDocument["status"]) {
  switch (status) {
    case "verified":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "uploaded":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export default async function DocumentsPage() {
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

  const isReviewerView = profile?.role === "reviewer" || profile?.role === "admin";

  let query = supabase
    .from("application_documents")
    .select("id, application_id, user_id, document_type, file_name, storage_path, status, notes, uploaded_at, verified_at")
    .order("uploaded_at", { ascending: false })
    .limit(30);

  if (!isReviewerView) {
    query = query.eq("user_id", user.id);
  }

  const { data: documentsData } = await query.returns<ApplicationDocument[]>();
  const documents = documentsData ?? [];
  const pending = documents.filter((document) => document.status === "pending" || document.status === "uploaded").length;
  const verified = documents.filter((document) => document.status === "verified").length;
  const rejected = documents.filter((document) => document.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            {isReviewerView
              ? "Review uploaded files, track verification work, and monitor sanction-letter readiness."
              : "Track your uploaded records and see which documents still need reviewer action."}
          </p>
        </div>
        <Link href="/applications" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Open full application workflow
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total documents</CardDescription>
            <CardTitle>{documents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Awaiting action</CardDescription>
            <CardTitle>{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Verified / Rejected</CardDescription>
            <CardTitle>{verified} / {rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document activity</CardTitle>
          <CardDescription>
            Upload and review actions happen inside Applications. This page gives you a clean live view of every document record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No document records yet. Approved applications will request documents automatically.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{titleize(document.document_type)}</p>
                      <p className="text-sm text-slate-600">{document.file_name}</p>
                      <p className="text-xs text-slate-500">Application ID: {document.application_id}</p>
                      {document.notes ? <p className="text-xs text-slate-500">Note: {document.notes}</p> : null}
                    </div>
                    <div className="space-y-2 text-right">
                      <Badge className={getStatusTone(document.status)} variant="outline">
                        {titleize(document.status)}
                      </Badge>
                      <p className="text-xs text-slate-500">
                        {new Date(document.uploaded_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
