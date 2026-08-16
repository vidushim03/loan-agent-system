import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { ConversationState } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { sanitizeUserMessage, validateConversationState } from '@/lib/utils/validators';
import { UnderwritingAgent } from '@/lib/agents/underwriting-agent';
import { getActiveUnderwritingPolicy } from '@/lib/services/underwriting-policy';
import { createApplicationRecord } from '@/lib/services/application-persistence';

export const runtime = 'edge';

const TERMINAL_STAGES = new Set(['approved', 'rejected']);

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
    const ip = forwardedFor.split(',')[0].trim();

    const rate = rateLimit(`chat:${ip}`, 25, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please slow down and try again shortly.',
          retryAfterMs: rate.retryAfterMs,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const message = sanitizeUserMessage(body?.message);
    const conversationState = body?.conversationState;

    if (!message) {
      return NextResponse.json({ error: 'Valid message is required' }, { status: 400 });
    }

    if (!validateConversationState(conversationState)) {
      return NextResponse.json({ error: 'Valid conversation state is required' }, { status: 400 });
    }

    const orchestrator = new Orchestrator();
    const result = await orchestrator.process({
      user_message: message,
      conversation_state: conversationState as ConversationState,
    });

    const supabase = await createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;

    const updatedState = result.updated_state;
    const loanData = updatedState.loan_data;
    const existingApplicationId =
      conversationState.application_id && !conversationState.application_id.startsWith('demo-')
        ? conversationState.application_id
        : null;

    let applicationId = existingApplicationId;

    // Persist the application once the conversation reaches a final decision.
    if (supabase && user && !applicationId && TERMINAL_STAGES.has(updatedState.stage) && loanData.pan_number) {
      try {
        const policy = await getActiveUnderwritingPolicy();
        const decision = new UnderwritingAgent(policy).evaluate(loanData);
        const createdId = await createApplicationRecord({
          supabase,
          userId: user.id,
          loanData,
          decision,
          policy,
          conversationSummary: updatedState.conversation_summary,
        });

        if (createdId) {
          applicationId = createdId;
          updatedState.application_id = createdId;
        }
      } catch (persistError) {
        console.error('Application persistence error (non-critical):', persistError);
      }
    }

    try {
      if (supabase && user && applicationId) {
        await supabase.from('conversation_logs').insert({
          application_id: applicationId,
          sender: 'user',
          message,
        });

        await supabase.from('conversation_logs').insert({
          application_id: applicationId,
          sender: 'agent',
          message: result.response,
          metadata: {
            agent_type: result.agent_used,
            stage: updatedState.stage,
          },
        });

        await supabase.from('agent_audit_logs').insert({
          application_id: applicationId,
          user_id: user.id,
          agent_used: result.agent_used || 'master',
          from_stage: conversationState.stage,
          to_stage: updatedState.stage,
          message_excerpt: message.slice(0, 120),
          conversation_summary: updatedState.conversation_summary || null,
        });
      }
    } catch (dbError) {
      console.error('Database logging error (non-critical):', dbError);
    }

    return NextResponse.json({
      success: true,
      response: result.response,
      updated_state: updatedState,
      agent_used: result.agent_used,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Chat API is running',
    timestamp: new Date().toISOString(),
  });
}
