import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApplicationsDashboard from "./applications-dashboard";
import type { ApplicationDocument, LoanApplication, UserProfile } from "@/types";

export default async function ApplicationsPage() {
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

  let applicationsQuery = supabase
    .from("loan_applications")
    .select("id, user_id, full_name, pan_number, employment_type, loan_amount_requested, sanctioned_amount, monthly_income, approval_status, application_stage, risk_band, policy_version, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (!isReviewerView) {
    applicationsQuery = applicationsQuery.eq("user_id", user.id);
  }

  const { data: applicationsData } = await applicationsQuery.returns<LoanApplication[]>();
  const applications = applicationsData ?? [];
  const applicationIds = applications.map((application) => application.id);

  let documents: ApplicationDocument[] = [];
  if (applicationIds.length > 0) {
    const { data: documentRows } = await supabase
      .from("application_documents")
      .select("id, application_id, user_id, document_type, file_name, storage_path, status, notes, uploaded_at, verified_at")
      .in("application_id", applicationIds)
      .order("uploaded_at", { ascending: true })
      .returns<ApplicationDocument[]>();

    documents = documentRows ?? [];
  }

  return (
    <ApplicationsDashboard
      applications={applications}
      currentUserId={user.id}
      documents={documents}
      isReviewerView={isReviewerView}
      profile={profile ?? null}
    />
  );
}
