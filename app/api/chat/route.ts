import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { ConversationState } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { sanitizeUserMessage, validateConversationState } from '@/lib/utils/validators';

export const runtime = 'edge';

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

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && conversationState.application_id) {
        await supabase.from('conversation_logs').insert({
          application_id: conversationState.application_id,
          sender: 'user',
          message,
        });

        await supabase.from('conversation_logs').insert({
          application_id: conversationState.application_id,
          sender: 'agent',
          message: result.response,
          metadata: {
            agent_type: result.agent_used,
            stage: result.updated_state.stage,
          },
        });

        await supabase.from('agent_audit_logs').insert({
          application_id: conversationState.application_id,
          user_id: user.id,
          agent_used: result.agent_used || 'master',
          from_stage: conversationState.stage,
          to_stage: result.updated_state.stage,
          message_excerpt: message.slice(0, 120),
          conversation_summary: result.updated_state.conversation_summary || null,
        });
      }
    } catch (dbError) {
      console.error('Database logging error (non-critical):', dbError);
    }

    return NextResponse.json({
      success: true,
      response: result.response,
      updated_state: result.updated_state,
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
