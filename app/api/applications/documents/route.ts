import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApplicationDocument, ApplicationLifecycle, UserProfile } from '@/types';
import { rateLimit } from '@/lib/utils/rate-limit';

export const runtime = 'edge';

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
  return forwardedFor.split(',')[0].trim();
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

async function getUserRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, role, organization, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle<UserProfile>();

  return profile?.role ?? 'customer';
}

async function syncApplicationStage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  applicationId: string,
  reviewerId?: string,
) {
  const { data: rows } = await supabase
    .from('application_documents')
    .select('id, application_id, user_id, document_type, file_name, storage_path, status, notes, uploaded_at, verified_at')
    .eq('application_id', applicationId)
    .returns<ApplicationDocument[]>();

  const documents = rows ?? [];
  let nextStage: ApplicationLifecycle = 'documents_pending';

  if (documents.length > 0 && documents.every((document) => document.status === 'verified')) {
    nextStage = 'completed';
  } else if (documents.some((document) => document.status === 'rejected')) {
    nextStage = 'documents_pending';
  } else if (documents.some((document) => document.status === 'uploaded')) {
    nextStage = 'under_review';
  }

  await supabase
    .from('loan_applications')
    .update({
      application_stage: nextStage,
      assigned_reviewer_id: reviewerId ?? null,
    })
    .eq('id', applicationId);

  return nextStage;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole(supabase, user.id);
    let query = supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: true });

    if (role === 'customer') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`documents:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { applicationId, documentType, fileName, storagePath } = body ?? {};

    if (!applicationId || !documentType || !fileName) {
      return NextResponse.json(
        { error: 'applicationId, documentType, and fileName are required' },
        { status: 400 }
      );
    }

    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: application } = await supabase
      .from('loan_applications')
      .select('id, user_id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('application_documents')
      .upsert(
        {
          application_id: applicationId,
          user_id: user.id,
          document_type: documentType,
          file_name: fileName,
          storage_path: storagePath || null,
          status: 'uploaded',
          verified_at: null,
        },
        { onConflict: 'application_id,document_type' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const applicationStage = await syncApplicationStage(supabase, applicationId);
    return NextResponse.json({ success: true, data, applicationStage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`documents-review:${ip}`, 40, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { applicationId, documentId, status, notes } = body ?? {};

    if (!applicationId || !documentId || !status) {
      return NextResponse.json({ error: 'applicationId, documentId, and status are required' }, { status: 400 });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be verified or rejected' }, { status: 400 });
    }

    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole(supabase, user.id);
    if (!['reviewer', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('application_documents')
      .update({
        status,
        notes: notes ?? null,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
      })
      .eq('id', documentId)
      .eq('application_id', applicationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const applicationStage = await syncApplicationStage(supabase, applicationId, user.id);
    return NextResponse.json({ success: true, data, applicationStage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
