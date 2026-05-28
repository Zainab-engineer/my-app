const BASE = 'http://localhost:3000';

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  const login = await loginRes.json();
  console.log('Login:', login.user ? 'OK' : 'FAIL', login.error || '');

  const token = login.token;
  if (!token) { console.log('No token - aborting'); return; }

  // Create document
  const docRes = await fetch(`${BASE}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `session_token=${token}` },
    body: JSON.stringify({ title: 'TestDoc' }),
  });
  const doc = await docRes.json();
  console.log('Doc created:', doc.id);

  // Send chat message
  console.log(`Sending chat to /api/documents/${doc.id}/chat...`);
  const start = Date.now();
  const chatRes = await fetch(`${BASE}/api/documents/${doc.id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `session_token=${token}` },
    body: JSON.stringify({ message: 'Write a short paragraph about artificial intelligence.' }),
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const chat = await chatRes.json();
  console.log(`Chat response (${elapsed}s):`, JSON.stringify(chat).substring(0, 300));

  // Check document persistence
  const checkRes = await fetch(`${BASE}/api/documents/${doc.id}`, {
    headers: { 'Cookie': `session_token=${token}` },
  });
  const check = await checkRes.json();
  console.log('Persisted messages count:', check.chatMessages?.length || 0);
}

main().catch(e => console.error('Script error:', e.message));
