// ============================================================================
// KYC VERIFICATION AGENT
// ============================================================================

import { verifyKYC, calculateAge } from '@/lib/mock-data/kyc-database';
import { KYCVerificationResult } from '@/types';
import { isValidPAN } from '@/lib/utils/calculations';
import { getAdminClient } from '@/lib/supabase/admin';

type SupabaseKYCRecord = {
  pan_number: string;
  full_name: string;
  date_of_birth: string;
  kyc_status: 'VERIFIED' | 'PENDING_AADHAAR_LINK' | 'BLOCKED' | 'FAILED';
  phone: string;
};

export class KYCAgent {
  private async fetchFromSupabase(pan: string): Promise<SupabaseKYCRecord | null> {
    const admin = getAdminClient();
    if (!admin) return null;

    const { data, error } = await admin
      .from('kyc_profiles')
      .select('pan_number, full_name, date_of_birth, kyc_status, phone')
      .eq('pan_number', pan)
      .maybeSingle();

    if (error || !data) return null;
    return data as SupabaseKYCRecord;
  }

  async verify(pan: string): Promise<KYCVerificationResult> {
    try {
      if (!isValidPAN(pan)) {
        return {
          success: false,
          error: 'Invalid PAN format. PAN should be like ABCDE1234F',
        };
      }

      const normalizedPAN = pan.toUpperCase();
      const supabaseRecord = await this.fetchFromSupabase(normalizedPAN);
      const record = supabaseRecord ?? (await verifyKYC(normalizedPAN));

      if (!record) {
        return {
          success: false,
          error: 'PAN not found in our records. Please verify the PAN number.',
        };
      }

      if (record.kyc_status !== 'VERIFIED') {
        return {
          success: false,
          error: `KYC Status: ${record.kyc_status}. Please complete your KYC verification first.`,
        };
      }

      const age = calculateAge(record.date_of_birth);

      return {
        success: true,
        data: {
          pan_number: record.pan_number,
          full_name: record.full_name,
          date_of_birth: record.date_of_birth,
          age,
          phone: record.phone,
          kyc_status: 'VERIFIED',
        },
      };
    } catch (error) {
      console.error('KYC Agent Error:', error);
      return {
        success: false,
        error: 'Failed to verify KYC. Please try again.',
      };
    }
  }

  generateResponse(result: KYCVerificationResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    const { full_name } = result.data!;
    return `KYC verified successfully. Welcome, ${full_name}. Let's continue with your loan application.`;
  }
}
