import { NextRequest, NextResponse } from 'next/server';
import { UnderwritingAgent } from '@/lib/agents/underwriting-agent';
import { LoanApplicationData } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getActiveUnderwritingPolicy } from '@/lib/services/underwriting-policy';

export const runtime = 'edge';

const REQUIRED_DOCUMENTS = ['identity_proof', 'income_proof', 'bank_statement'];

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
  return forwardedFor.split(',')[0].trim();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`underwriting:${ip}`, 15, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests', retryAfterMs: limit.retryAfterMs }, { status: 429 });
    }

    const body = await request.json();
    const { loanData, userId } = body;

    if (!loanData || typeof loanData !== 'object') {
      return NextResponse.json({ error: 'Loan data is required' }, { status: 400 });
    }

    const policy = await getActiveUnderwritingPolicy();
    const underwritingAgent = new UnderwritingAgent(policy);
    const decision = underwritingAgent.evaluate(loanData as LoanApplicationData);
    const responseMessage = underwritingAgent.generateResponse(decision, loanData.full_name || 'Customer');
    const lifecycleStage = decision.approved ? 'documents_pending' : 'rejected';
    const riskBand =
      !loanData.credit_score ? 'unknown' :
      loanData.credit_score >= 750 ? 'low' :
      loanData.credit_score >= 650 ? 'medium' :
      'high';

    let applicationId: string | null = null;

    if (userId) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
          return NextResponse.json({ error: 'Unauthorized user context' }, { status: 401 });
        }

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
          approval_status: decision.approved ? 'approved' : 'rejected',
          application_stage: lifecycleStage,
          policy_version: policy.version,
          risk_band: riskBand,
          sanctioned_amount: decision.sanctioned_amount,
          interest_rate: decision.interest_rate,
          monthly_emi: decision.monthly_emi,
          rejection_reason: decision.rejection_reason,
          failed_rules: decision.failed_rules,
          conversation_summary: body?.conversationSummary || null,
        };

        const { data, error } = await supabase
          .from('loan_applications')
          .insert(applicationData)
          .select()
          .single();

        if (error) {
          console.error('Database insert error:', error);
        } else {
          applicationId = data.id;

          if (decision.approved) {
            const documentRows = REQUIRED_DOCUMENTS.map((documentType) => ({
              application_id: data.id,
              user_id: userId,
              document_type: documentType,
              file_name: `${documentType}.pending`,
              status: 'pending',
            }));

            await supabase.from('application_documents').insert(documentRows);
          }
        }
      } catch (dbError) {
        console.error('Database error (non-critical):', dbError);
      }
    }

    let counterOffer = null;
    if (!decision.approved) {
      const counterOfferAmount = underwritingAgent.calculateCounterOffer(loanData as LoanApplicationData);
      if (counterOfferAmount) {
        counterOffer = {
          amount: counterOfferAmount,
          message: `We can offer up to INR ${counterOfferAmount.toLocaleString('en-IN')} instead.`,
        };
      }
    }

    return NextResponse.json({
      success: true,
      decision: decision.approved ? 'approved' : 'rejected',
      data: decision,
      message: responseMessage,
      applicationId,
      policyVersion: policy.version,
      lifecycleStage,
      riskBand,
      counterOffer,
    });
  } catch (error) {
    console.error('Underwriting API Error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate loan application', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('id');

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('loan_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get Application Error:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}
