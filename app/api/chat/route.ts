import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.message || !body?.conversationState) {
      return NextResponse.json({ error: 'Valid message and conversation state required' }, { status: 400 });
    }

    // Proxy the request to the Python FastAPI microservice
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python backend error:', errorText);
      return NextResponse.json(
        { error: `Python backend failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to proxy message to Python backend',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Next.js Proxy API is running',
    timestamp: new Date().toISOString(),
  });
}
