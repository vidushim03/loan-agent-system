import { NextRequest, NextResponse } from 'next/server';
import { UnderwritingAgent } from '@/lib/agents/underwriting-agent';
import { LoanApplicationData } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getActiveUnderwritingPolicy } from '@/lib/services/underwriting-policy';
import { createApplicationRecord, getRiskBand } from '@/lib/services/application-persistence';

export const runtime = 'edge';

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
    const riskBand = getRiskBand(loanData.credit_score);

    let applicationId: string | null = null;

    if (userId) {
      const supabase = await createClient();
      if (!supabase) {
        console.warn('Underwriting: Supabase not configured, skipping application persistence (demo mode).');
      } else {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user || user.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized user context' }, { status: 401 });
          }

          applicationId = await createApplicationRecord({
            supabase,
            userId,
            loanData: loanData as LoanApplicationData,
            decision,
            policy,
            conversationSummary: body?.conversationSummary,
          });
        } catch (dbError) {
          console.error('Database error (non-critical):', dbError);
        }
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
    if (!supabase) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

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
