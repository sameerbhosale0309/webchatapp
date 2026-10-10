import { Call } from '../models/Call.js';

export async function createCallLog(req, res) {
  try {
    const { receiverId, type = 'audio', status = 'completed', duration = 0 } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    const call = await Call.create({
      caller: req.userId,
      receiver: receiverId,
      type,
      status,
      duration,
    });

    const populated = await Call.findById(call._id)
      .populate('caller', 'username avatar status')
      .populate('receiver', 'username avatar status');

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCalls(req, res) {
  try {
    const rawCalls = await Call.find({
      $or: [{ caller: req.userId }, { receiver: req.userId }],
    })
      .populate('caller', 'username avatar status')
      .populate('receiver', 'username avatar status')
      .sort({ createdAt: -1 })
      .limit(50);

    const calls = rawCalls.filter((c) => c.caller && c.receiver);

    return res.status(200).json({ success: true, data: calls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function clearCallHistory(req, res) {
  try {
    await Call.deleteMany({
      $or: [{ caller: req.userId }, { receiver: req.userId }],
    });
    return res.status(200).json({ success: true, message: 'Call history cleared' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
