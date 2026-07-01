require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find a chat
    const chat = await mongoose.connection.db.collection('chats').findOne();
    if (!chat) {
      console.log('No chats found in DB');
    } else {
      console.log('Found chat ID:', chat._id.toString());
      console.log('Chat Title:', chat.title);
      console.log('Chat messages count:', chat.messages?.length);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
