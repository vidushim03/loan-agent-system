import { ConversationState } from "@/types";

const VALID_STAGES = new Set([
  "greeting",
  "collect_pan",
  "collect_phone",
  "collect_employment",
  "collect_income",
  "collect_loan_details",
  "collect_existing_obligations",
  "underwriting",
  "approved",
  "rejected",
  "completed",
]);

export function sanitizeUserMessage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  if (value.length > 1000) return value.slice(0, 1000);
  return value;
}

export function validateConversationState(input: unknown): input is ConversationState {
  if (!input || typeof input !== "object") return false;
  const state = input as ConversationState;

  if (!state.stage || !VALID_STAGES.has(state.stage)) return false;
  if (!state.loan_data || typeof state.loan_data !== "object") return false;
  if (!Array.isArray(state.messages)) return false;
  if (typeof state.kyc_verified !== "boolean") return false;
  if (typeof state.credit_checked !== "boolean") return false;

  return true;
}
