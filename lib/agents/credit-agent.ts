// ============================================================================
// CREDIT ASSESSMENT AGENT
// ============================================================================

import { fetchCreditScore, getCreditScoreBand } from '@/lib/mock-data/credit-database';
import { CreditCheckResult } from '@/types';
import { getAdminClient } from '@/lib/supabase/admin';

type SupabaseCreditRecord = {
  pan_number: string;
  score: number;
  status: string;
  active_loans: number;
  credit_history_years: number;
  defaults: number;
};

export class CreditAgent {
  private async fetchFromSupabase(pan: string): Promise<SupabaseCreditRecord | null> {
    const admin = getAdminClient();
    if (!admin) return null;

    const { data, error } = await admin
      .from('credit_profiles')
      .select('pan_number, score, status, active_loans, credit_history_years, defaults')
      .eq('pan_number', pan)
      .maybeSingle();

    if (error || !data) return null;
    return data as SupabaseCreditRecord;
  }

  async checkCredit(pan: string): Promise<CreditCheckResult> {
    try {
      const normalizedPAN = pan.toUpperCase();
      const supabaseRecord = await this.fetchFromSupabase(normalizedPAN);
      const creditRecord = supabaseRecord ?? (await fetchCreditScore(normalizedPAN));

      if (!creditRecord) {
        return {
          success: false,
          error: 'No credit history found. Unable to assess creditworthiness.',
        };
      }

      return {
        success: true,
        data: {
          score: creditRecord.score,
          status: creditRecord.status,
          active_loans: creditRecord.active_loans,
          credit_history_years: creditRecord.credit_history_years,
          defaults:
            creditRecord.defaults > 0
              ? `${creditRecord.defaults} default(s) in past 2 years`
              : 'No defaults',
        },
      };
    } catch (error) {
      console.error('Credit Agent Error:', error);
      return {
        success: false,
        error: 'Failed to fetch credit score. Please try again.',
      };
    }
  }

  generateResponse(result: CreditCheckResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    const { score, status, active_loans, credit_history_years } = result.data!;
    const band = getCreditScoreBand(score);

    return `Credit Score: ${score} (${band})\n\nCredit Assessment:\n- Status: ${status}\n- Active Loans: ${active_loans}\n- Credit History: ${credit_history_years} years\n\nYour credit profile has been analyzed successfully.`;
  }

  meetsMinimumRequirement(score: number): boolean {
    return score >= 650;
  }
}
