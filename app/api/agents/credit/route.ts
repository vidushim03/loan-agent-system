import { NextRequest, NextResponse } from 'next/server';
import { CreditAgent } from '@/lib/agents/credit-agent';
import { rateLimit } from '@/lib/utils/rate-limit';

export const runtime = 'edge';

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
  return forwardedFor.split(',')[0].trim();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`credit:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests', retryAfterMs: limit.retryAfterMs }, { status: 429 });
    }

    const body = await request.json();
    const pan = typeof body?.pan === 'string' ? body.pan.trim().toUpperCase() : '';

    if (!pan) {
      return NextResponse.json({ error: 'PAN number is required' }, { status: 400 });
    }

    const creditAgent = new CreditAgent();
    const result = await creditAgent.checkCredit(pan);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const meetsMinimum = creditAgent.meetsMinimumRequirement(result.data!.score);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: creditAgent.generateResponse(result),
      meetsMinimumRequirement: meetsMinimum,
    });
  } catch (error) {
    console.error('Credit API Error:', error);
    return NextResponse.json(
      { error: 'Failed to check credit score', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Credit Assessment API',
    timestamp: new Date().toISOString(),
  });
}
