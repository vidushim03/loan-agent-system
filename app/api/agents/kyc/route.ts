import { NextRequest, NextResponse } from 'next/server';
import { KYCAgent } from '@/lib/agents/kyc-agent';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyKYC } from '@/lib/mock-data/kyc-database';
import { rateLimit } from '@/lib/utils/rate-limit';

export const runtime = 'edge';

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
  return forwardedFor.split(',')[0].trim();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`kyc:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests', retryAfterMs: limit.retryAfterMs }, { status: 429 });
    }

    const body = await request.json();
    const pan = typeof body?.pan === 'string' ? body.pan.trim().toUpperCase() : '';

    if (!pan) {
      return NextResponse.json({ error: 'PAN number is required' }, { status: 400 });
    }

    const kycAgent = new KYCAgent();
    const result = await kycAgent.verify(pan);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    try {
      const admin = getAdminClient();
      if (admin) {
        await admin.from('kyc_verifications').upsert({
          pan_number: result.data!.pan_number,
          full_name: result.data!.full_name,
          kyc_status: result.data!.kyc_status,
          verified_at: new Date().toISOString(),
        });
      }
    } catch (dbError) {
      console.error('Database error (non-critical):', dbError);
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: kycAgent.generateResponse(result),
    });
  } catch (error) {
    console.error('KYC API Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify KYC', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pan = (searchParams.get('pan') || '').trim().toUpperCase();

    if (!pan) {
      return NextResponse.json({ error: 'PAN number is required' }, { status: 400 });
    }

    const admin = getAdminClient();

    if (!admin) {
      const record = await verifyKYC(pan);
      if (!record) {
        return NextResponse.json({ error: 'KYC record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: record });
    }

    const { data, error } = await admin
      .from('kyc_verifications')
      .select('*')
      .eq('pan_number', pan)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'KYC record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('KYC GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch KYC data' }, { status: 500 });
  }
}
