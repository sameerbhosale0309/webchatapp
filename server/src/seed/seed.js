import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Story } from '../models/Story.js';
import { Call } from '../models/Call.js';

async function seed() {
  console.log('🧹 Cleaning demo data from database...');
  await connectDB();

  // Find demo users
  const demoUsers = await User.find({ username: { $in: ['alice', 'bob', 'charlie', 'diana'] } });
  const demoUserIds = demoUsers.map((u) => u._id);

  if (demoUserIds.length > 0) {
    // Delete messages sent by or in conversations of demo users
    await Message.deleteMany({ sender: { $in: demoUserIds } });
    await Conversation.deleteMany({ participants: { $in: demoUserIds } });
    await Story.deleteMany({ user: { $in: demoUserIds } });
    await Call.deleteMany({ $or: [{ caller: { $in: demoUserIds } }, { receiver: { $in: demoUserIds } }] });
    await User.deleteMany({ _id: { $in: demoUserIds } });
    console.log(`✅ Removed ${demoUsers.length} demo accounts (alice, bob, charlie, diana) and associated demo data.`);
  } else {
    console.log('ℹ️ No demo accounts found in database.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Clean script failed:', err);
  process.exit(1);
});
