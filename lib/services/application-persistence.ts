import { v4 as uuidv4 } from "uuid";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { LoanApplicationData, UnderwritingDecision } from "@/types";
import type { UnderwritingPolicyConfig } from "@/lib/services/underwriting-policy";

const REQUIRED_DOCUMENTS = ["identity_proof", "income_proof", "bank_statement"];

export function getRiskBand(creditScore?: number): string {
  if (!creditScore) return "unknown";
  if (creditScore >= 750) return "low";
  if (creditScore >= 650) return "medium";
  return "high";
}

export type CreateApplicationOptions = {
  supabase: SupabaseServerClient;
  userId: string;
  loanData: LoanApplicationData;
  decision: UnderwritingDecision;
  policy: UnderwritingPolicyConfig;
  conversationSummary?: string | null;
};

export async function createApplicationRecord(
  options: CreateApplicationOptions
): Promise<string | null> {
  const { supabase, userId, loanData, decision, policy, conversationSummary } = options;

  const applicationData = {
    id: uuidv4(),
    user_id: userId,
    pan_number: loanData.pan_number,
    full_name: loanData.full_name,
    age: loanData.age,
    phone: loanData.phone,
    employment_type: loanData.employment_type,
    monthly_income: loanData.monthly_income,
    company_name: loanData.company_name,
    loan_amount_requested: loanData.loan_amount_requested,
    loan_purpose: loanData.loan_purpose,
    preferred_tenure: loanData.preferred_tenure,
    existing_emi: loanData.existing_emi || 0,
    has_credit_card: loanData.has_credit_card || false,
    credit_card_outstanding: loanData.credit_card_outstanding || 0,
    credit_score: loanData.credit_score,
    credit_status: loanData.credit_status,
    active_loans: loanData.active_loans || 0,
    approval_status: decision.approved ? "approved" : "rejected",
    application_stage: decision.approved ? "documents_pending" : "rejected",
    policy_version: policy.version,
    risk_band: getRiskBand(loanData.credit_score),
    sanctioned_amount: decision.sanctioned_amount,
    interest_rate: decision.interest_rate,
    monthly_emi: decision.monthly_emi,
    rejection_reason: decision.rejection_reason,
    failed_rules: decision.failed_rules,
    conversation_summary: conversationSummary ?? null,
  };

  const { data, error } = await supabase
    .from("loan_applications")
    .insert(applicationData)
    .select()
    .single();

  if (error) {
    console.error("Database insert error:", error);
    return null;
  }

  if (decision.approved) {
    const documentRows = REQUIRED_DOCUMENTS.map((documentType) => ({
      application_id: data.id,
      user_id: userId,
      document_type: documentType,
      file_name: `${documentType}.pending`,
      status: "pending",
    }));

    const { error: documentError } = await supabase
      .from("application_documents")
      .insert(documentRows);

    if (documentError) {
      console.error("Document insert error (non-critical):", documentError);
    }
  }

  return data.id;
}
