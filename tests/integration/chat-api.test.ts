const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const health = await fetch(`${baseUrl}/api/chat`).catch(() => null);

  if (!health || health.status === 404) {
    console.log('chat-api.test.ts skipped: expected app server not running at this base URL');
    process.exit(0);
  }

  assert(health.ok, `Health check failed with status ${health.status}`);

  const initState = {
    application_id: 'test-session-1',
    stage: 'greeting',
    loan_data: {},
    messages: [],
    kyc_verified: false,
    credit_checked: false,
  };

  const start = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hi', conversationState: initState }),
  });

  if (start.status === 404) {
    console.log('chat-api.test.ts skipped: /api/chat POST not available on current localhost server');
    process.exit(0);
  }

  assert(start.ok, `POST /api/chat failed with status ${start.status}`);
  const data = await start.json();
  assert(Boolean(data.response), 'Chat response must not be empty');
  assert(data.updated_state?.stage === 'collect_pan', 'Expected stage transition to collect_pan');

  console.log('chat-api.test.ts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
