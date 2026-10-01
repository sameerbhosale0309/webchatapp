import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';

// Global map tracking active online user IDs -> Set of socket IDs
const onlineUsers = new Map();

export function setupSocketIO(io) {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        parseCookie(socket.handshake.headers?.cookie)?.accessToken;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user.username})`);

    // Add to onlineUsers map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room
    socket.join(`user:${userId}`);

    // Update user status to online in DB if this is their first active connection
    if (onlineUsers.get(userId).size === 1) {
      await User.findByIdAndUpdate(userId, { status: 'online' });
      io.emit('user:status_change', { userId, status: 'online' });
    }

    // Emit list of currently online user IDs to the newly connected user
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Join specific conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Leave specific conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send Message real-time event
    socket.on('message:send', async ({ conversationId, message, recipientIds }) => {
      // Emit to conversation room
      io.to(`conversation:${conversationId}`).emit('message:new', message);

      // Emit conversation update to participants' personal rooms
      if (recipientIds && Array.isArray(recipientIds)) {
        recipientIds.forEach((rId) => {
          io.to(`user:${rId}`).emit('conversation:updated', { conversationId, lastMessage: message });
        });
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        user: { _id: socket.user._id, username: socket.user.username },
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        user: { _id: socket.user._id, username: socket.user.username },
      });
    });

    // Read receipt event
    socket.on('message:read', ({ conversationId, userId, participantIds }) => {
      io.to(`conversation:${conversationId}`).emit('message:read_update', {
        conversationId,
        userId,
      });
      if (participantIds && Array.isArray(participantIds)) {
        participantIds.forEach((pId) => {
          io.to(`user:${pId}`).emit('message:read_update', { conversationId, userId });
        });
      }
    });

    // Reaction update
    socket.on('reaction:toggle', ({ conversationId, messageId, reactions }) => {
      io.to(`conversation:${conversationId}`).emit('reaction:updated', {
        messageId,
        reactions,
      });
    });

    // Message delete real-time event
    socket.on('message:delete', ({ conversationId, message }) => {
      io.to(`conversation:${conversationId}`).emit('message:deleted', {
        conversationId,
        message,
      });
    });

    // WebRTC Calling Signaling
    socket.on('call:invite', ({ targetUserId, conversationId, callType, offer }) => {
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        fromUser: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
        conversationId,
        callType, // 'video' | 'audio'
        offer,
      });
    });

    socket.on('call:accept', ({ targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('call:accepted', { answer });
    });

    socket.on('call:reject', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call:rejected');
    });

    socket.on('call:end', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call:ended');
    });

    socket.on('call:ice_candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('call:ice_candidate', { candidate });
    });

    // Explicit instant disconnect signal from client
    socket.on('user:go_offline', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date().toISOString();
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen });
          io.emit('user:status_change', { userId, status: 'offline', lastSeen });
        }
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date().toISOString();
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen });
          io.emit('user:status_change', { userId, status: 'offline', lastSeen });
        }
      }
    });
  });
}

function parseCookie(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, ...v] = cookie.trim().split('=');
      return [key, v.join('=')];
    })
  );
}
