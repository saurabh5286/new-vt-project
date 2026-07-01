const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function test() {
  const api = axios.create({ baseURL: 'http://127.0.0.1:5000/api/v1' });
  try {
    console.log('1. Healthcheck...');
    // test the server is up
    await axios.get('http://127.0.0.1:5000/api/health');
    console.log('✅ Backend is up.');
    
    console.log('2. Registering test user...');
    const email = `test${Date.now()}@example.com`;
    const res = await api.post('/auth/register', { name: "Test User", email, password: "password123" });
    const token = res.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('✅ Registered successfully:', res.data.user.email);

    console.log('3. Creating test workspace...');
    const createRes = await api.post('/workspaces', { name: 'Test WS' }, { headers: authHeaders });
    const wsId = createRes.data._id;
    console.log('✅ Workspace created:', wsId);

    console.log('4. Uploading document...');
    fs.writeFileSync('test_upload.txt', 'DocuMind AI is a smart document platform developed by Saurabh in 2026.');
    const form = new FormData();
    form.append('file', fs.createReadStream('test_upload.txt'));
    form.append('workspaceId', wsId);

    const uploadRes = await api.post('/documents/upload', form, {
      headers: { ...form.getHeaders(), ...authHeaders },
    });
    console.log('✅ Upload response received, document ID:', uploadRes.data.document.id);

    const docId = uploadRes.data.document.id;
    
    console.log('Polling document processing status...');
    let status = 'Processing';
    for (let i = 0; i < 15; i++) {
      const statusRes = await api.get(`/documents/${docId}/status`, { headers: authHeaders });
      status = statusRes.data.status;
      console.log(`- Status at ${i*2}s: ${status}`);
      if (status === 'Completed' || status === 'Failed') break;
      await new Promise(r => setTimeout(r, 2000));
    }

    if (status !== 'Completed') throw new Error(`Document processing stopped at state: ${status}`);
    console.log('✅ Document processing complete.');

    console.log('5. Chatting with document (RAG pipeline)...');
    const chatRes = await api.post('/chat/message', {
      workspaceId: wsId,
      question: "Who developed DocuMind AI and when?"
    }, { headers: authHeaders });
    console.log('\n💬 AI Answer:', chatRes.data.answer);
    console.log('📑 Citations provided:', chatRes.data.citations.length);

    console.log('\n🎉 ALL PIPELINE TESTS PASSED (Registration -> Upload -> Chunking -> Embedding -> Qdrant -> Chat).');
  } catch (err) {
    if (err.response) {
      console.error('\n❌ API Error:', err.response.data);
    } else {
      console.error('\n❌ Execution Error:', err.message);
    }
  }
}
test();
