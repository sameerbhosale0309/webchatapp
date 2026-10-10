import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  
  const attemptConnect = async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ MongoDB connected successfully!');
      return true;
    } catch (primaryErr) {
      console.warn('⚠️ Primary MongoDB connection failed:', primaryErr.message);
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
        await mongoose.connect('mongodb://127.0.0.1:27017/realtime_chat', { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Fallback local MongoDB connected!');
        return true;
      } catch (fallbackErr) {
        console.error('❌ Could not connect to primary Atlas cluster or local MongoDB.');
        console.error('👉 Please whitelist your IP (0.0.0.0/0) in MongoDB Atlas or start local MongoDB service.');
        return false;
      }
    }
  };

  const connected = await attemptConnect();

  if (!connected) {
    console.log('⏱️ Will retry database connection in background every 15 seconds...');
    const retryInterval = setInterval(async () => {
      if (mongoose.connection.readyState === 1) {
        clearInterval(retryInterval);
        return;
      }
      console.log('🔄 Retrying MongoDB connection...');
      const success = await attemptConnect();
      if (success) {
        clearInterval(retryInterval);
      }
    }, 15000);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
  });
}