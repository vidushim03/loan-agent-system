const testChat = async () => {
  const url = 'http://localhost:3005/api/chat';
  
  const initialState = {
    application_id: 'test-session-1',
    stage: 'greeting',
    loan_data: {},
    messages: [],
    kyc_verified: false,
    credit_checked: false,
  };

  const body = {
    message: 'Hello there!',
    conversationState: initialState
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('Request failed with status:', res.status);
        console.error('Response text:', text);
        return;
    }

    const data = await res.json();
    console.log('=== CHAT API TEST RESULT ===');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test Failed:', err);
  }
};

testChat();
