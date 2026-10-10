import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';

export async function getConversations(req, res) {
  try {
    const rawConversations = await Conversation.find({ participants: req.userId })
      .populate('participants', 'username email avatar status lastSeen bio')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .populate('groupAdmin', 'username avatar')
      .sort({ updatedAt: -1 })
      .lean();

    const conversations = [];

    for (const conv of rawConversations) {
      const validParticipants = (conv.participants || []).filter(Boolean);

      if (conv.type === 'direct') {
        // Direct conversation requires 2 valid populated users
        if (validParticipants.length < 2) {
          // Asynchronously clean up orphaned conversation from DB
          Conversation.deleteOne({ _id: conv._id }).exec().catch(() => {});
          continue;
        }
        conv.participants = validParticipants;
      } else if (conv.type === 'group') {
        conv.participants = validParticipants;
        if (validParticipants.length === 0) {
          Conversation.deleteOne({ _id: conv._id }).exec().catch(() => {});
          continue;
        }
      }
      conversations.push(conv);
    }

    return res.status(200).json({ success: true, data: conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createConversation(req, res) {
  try {
    const { type = 'direct', recipientId, name, avatar, participantIds = [] } = req.body;

    if (type === 'direct') {
      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'Recipient ID is required for direct conversations' });
      }

      // Check if conversation already exists
      let existing = await Conversation.findOne({
        type: 'direct',
        participants: { $all: [req.userId, recipientId], $size: 2 },
      })
        .populate('participants', 'username email avatar status lastSeen bio')
        .populate('lastMessage');

      if (existing) {
        return res.status(200).json({ success: true, data: existing });
      }

      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ success: false, message: 'Recipient user not found' });
      }

      const newConversation = await Conversation.create({
        type: 'direct',
        participants: [req.userId, recipientId],
        unreadCounts: { [req.userId]: 0, [recipientId]: 0 },
      });

      const populated = await Conversation.findById(newConversation._id).populate(
        'participants',
        'username email avatar status lastSeen bio'
      );

      return res.status(201).json({ success: true, data: populated });
    } else {
      // Group conversation
      if (!name) {
        return res.status(400).json({ success: false, message: 'Group name is required' });
      }

      const allParticipants = Array.from(new Set([req.userId, ...participantIds]));
      if (allParticipants.length < 2) {
        return res.status(400).json({ success: false, message: 'Group must have at least 2 members' });
      }

      const unreadMap = {};
      allParticipants.forEach((pId) => {
        unreadMap[pId] = 0;
      });

      const group = await Conversation.create({
        type: 'group',
        name,
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        participants: allParticipants,
        groupAdmin: req.userId,
        unreadCounts: unreadMap,
      });

      const populated = await Conversation.findById(group._id)
        .populate('participants', 'username email avatar status lastSeen bio')
        .populate('groupAdmin', 'username avatar');

      return res.status(201).json({ success: true, data: populated });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getConversationById(req, res) {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username email avatar status lastSeen bio')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .populate('groupAdmin', 'username avatar');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Check membership
    const isMember = conversation.participants.some((p) => p._id.toString() === req.userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this conversation' });
    }

    return res.status(200).json({ success: true, data: conversation });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(req.userId, 0);
      await conversation.save();
    }

    // Mark messages in this conversation as read by this user
    await Message.updateMany(
      { conversationId: id, readBy: { $ne: req.userId } },
      { $addToSet: { readBy: req.userId } }
    );

    return res.status(200).json({ success: true, message: 'Conversation marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function addParticipant(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return res.status(400).json({ success: false, message: 'Group conversation not found' });
    }

    if (!conversation.participants.includes(userId)) {
      conversation.participants.push(userId);
      if (!conversation.unreadCounts) conversation.unreadCounts = new Map();
      conversation.unreadCounts.set(userId, 0);
      await conversation.save();
    }

    const updated = await Conversation.findById(id)
      .populate('participants', 'username email avatar status lastSeen bio')
      .populate('groupAdmin', 'username avatar');

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function removeParticipant(req, res) {
  try {
    const { id, userId } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return res.status(400).json({ success: false, message: 'Group conversation not found' });
    }

    conversation.participants = conversation.participants.filter((p) => p.toString() !== userId);

    if (conversation.participants.length === 0) {
      await Conversation.deleteOne({ _id: id });
      return res.status(200).json({ success: true, message: 'Group deleted as all participants left' });
    }

    // Transfer admin rights if leaving member was groupAdmin
    if (conversation.groupAdmin && conversation.groupAdmin.toString() === userId) {
      conversation.groupAdmin = conversation.participants[0];
    }

    await conversation.save();

    const updated = await Conversation.findById(id)
      .populate('participants', 'username email avatar status lastSeen bio')
      .populate('groupAdmin', 'username avatar');

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateGroupProfile(req, res) {
  try {
    const { id } = req.params;
    const { name, avatar, description, groupAdmin } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group conversation not found' });
    }

    if (name) conversation.name = name;
    if (avatar) conversation.avatar = avatar;
    if (description !== undefined) conversation.description = description;
    if (groupAdmin) conversation.groupAdmin = groupAdmin;

    await conversation.save();

    const updated = await Conversation.findById(id)
      .populate('participants', 'username email avatar status lastSeen bio')
      .populate('groupAdmin', 'username avatar');

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateConversationSettings(req, res) {
  try {
    const { id } = req.params;
    const { customName, theme } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isMember = conversation.participants.some((p) => p.toString() === req.userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!conversation.customNames) conversation.customNames = new Map();
    if (!conversation.themes) conversation.themes = new Map();

    if (customName !== undefined) {
      if (!customName || customName.trim() === '') {
        conversation.customNames.delete(req.userId.toString());
      } else {
        conversation.customNames.set(req.userId.toString(), customName.trim());
      }
    }

    if (theme !== undefined) {
      conversation.themes.set(req.userId.toString(), theme);
    }

    await conversation.save();

    const updated = await Conversation.findById(id)
      .populate('participants', 'username email avatar status lastSeen bio')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .populate('groupAdmin', 'username avatar');

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
