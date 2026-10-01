import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username email avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username' },
      })
      .sort({ createdAt: 1 })
      .limit(Number(limit));

    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function sendMessage(req, res) {
  try {
    const { conversationId } = req.params;
    const { content, attachments = [], replyTo } = req.body;

    if (!content && attachments.length === 0) {
      return res.status(400).json({ success: false, message: 'Message content or attachments required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const message = await Message.create({
      conversationId,
      sender: req.userId,
      content,
      attachments,
      replyTo: replyTo || null,
      readBy: [req.userId],
    });

    // Update conversation last message and increment unread for other participants
    conversation.lastMessage = message._id;
    if (!conversation.unreadCounts) {
      conversation.unreadCounts = new Map();
    }

    conversation.participants.forEach((pId) => {
      const idStr = pId.toString();
      if (idStr !== req.userId) {
        const currentCount = conversation.unreadCounts.get(idStr) || 0;
        conversation.unreadCounts.set(idStr, currentCount + 1);
      }
    });

    await conversation.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username email avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username' },
      });

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleReaction(req, res) {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.emoji === emoji && r.user.toString() === req.userId
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, user: req.userId });
    }

    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'username email avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username' },
      });

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    return res.status(200).json({ success: true, data: message });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
