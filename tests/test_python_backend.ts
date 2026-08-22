const testBackend = async () => {
    try {
        const url = 'http://localhost:8000/api/chat';
        console.log('Testing python backend directly:', url);
        
        const payload = {
            message: "My PAN is ABCDE1234F",
            conversationState: {
                stage: "collect_pan",
                loan_data: {},
                messages: [],
                kyc_verified: false,
                credit_checked: false,
                stage_history: [],
                application_id: "test-app-id"
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        const txt = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", txt.substring(0, 500));
    } catch(e) {
        console.error("Test failed", e);
    }
}
testBackend();
