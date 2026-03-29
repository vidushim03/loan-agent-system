import { getAdminClient } from "@/lib/supabase/admin";

export type UnderwritingPolicyConfig = {
  policy_name: string;
  version: number;
  min_age: number;
  max_age: number;
  min_income_salaried: number;
  min_income_self_employed: number;
  min_credit_score: number;
  max_dti_ratio: number;
  max_loan_multiplier_salaried: number;
  max_loan_multiplier_self_employed: number;
};

export const DEFAULT_UNDERWRITING_POLICY: UnderwritingPolicyConfig = {
  policy_name: "Default Personal Loan Policy",
  version: 1,
  min_age: 21,
  max_age: 60,
  min_income_salaried: 25000,
  min_income_self_employed: 40000,
  min_credit_score: 650,
  max_dti_ratio: 50,
  max_loan_multiplier_salaried: 10,
  max_loan_multiplier_self_employed: 5,
};

export async function getActiveUnderwritingPolicy(): Promise<UnderwritingPolicyConfig> {
  const admin = getAdminClient();
  if (!admin) {
    return DEFAULT_UNDERWRITING_POLICY;
  }

  const { data, error } = await admin
    .from("underwriting_policies")
    .select(
      "policy_name, version, min_age, max_age, min_income_salaried, min_income_self_employed, min_credit_score, max_dti_ratio, max_loan_multiplier_salaried, max_loan_multiplier_self_employed"
    )
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_UNDERWRITING_POLICY;
  }

  return {
    policy_name: data.policy_name,
    version: data.version,
    min_age: Number(data.min_age),
    max_age: Number(data.max_age),
    min_income_salaried: Number(data.min_income_salaried),
    min_income_self_employed: Number(data.min_income_self_employed),
    min_credit_score: Number(data.min_credit_score),
    max_dti_ratio: Number(data.max_dti_ratio),
    max_loan_multiplier_salaried: Number(data.max_loan_multiplier_salaried),
    max_loan_multiplier_self_employed: Number(data.max_loan_multiplier_self_employed),
  };
}
