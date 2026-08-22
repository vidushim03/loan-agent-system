const checkHealth = async () => {
  const url = 'http://localhost:3000/api/chat';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('HEALTH CHECK RESULT:', data);
  } catch (err) {
    console.error('Health Check Failed:', err);
  }
};
checkHealth();
