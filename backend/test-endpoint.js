const axios = require('axios');

async function testFetch() {
  try {
    const chatId = '6a449e77ab134a37c6c6bf5f';
    const res = await axios.get(`http://localhost:5000/api/v1/chat/share/${chatId}`);
    console.log('Status code:', res.status);
    console.log('Response title:', res.data.title);
    console.log('Response messages count:', res.data.messages?.length);
  } catch (err) {
    if (err.response) {
      console.log('Response Error status:', err.response.status);
      console.log('Response Error data:', err.response.data);
    } else {
      console.log('Error message:', err.message);
    }
  }
}

testFetch();
