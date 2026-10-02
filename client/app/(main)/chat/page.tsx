'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useChatStore, Message, Conversation } from '@/stores/chatStore';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/stores/toastStore';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { TypingIndicator, TypingDots } from '@/components/ui/TypingIndicator';
import { SwipeableChatItem } from '@/components/ui/SwipeableChatItem';

import {
  MessageSquare,
  Search,
  Plus,
  Users,
  Phone,
  Video,
  Info,
  Ban,
  Send,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Reply,
  Trash2,
  Check,
  CheckCheck,
  LogOut,
  Moon,
  Sun,
  X,
  FileText,
  Image as ImageIcon,
  PhoneOff,
  ChevronLeft,
  Camera,
  Bell,
  Eye,
  Bookmark,
  Lock,
  Sparkles,
  UserPlus,
  Flame,
  Heart,
  Pin,
  PinOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Play,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface StoryGroup {
  user: {
    _id: string;
    username: string;
    avatar: string;
    email: string;
  };
  stories: Array<{
    _id: string;
    mediaUrl: string;
    mediaType: 'image' | 'text';
    caption: string;
    bgGradient?: string;
    views?: any[];
    createdAt: string;
    isViewed?: boolean;
  }>;
  hasUnviewed: boolean;
}

export interface CallLog {
  _id: string;
  caller: { _id: string; username: string; avatar: string };
  receiver: { _id: string; username: string; avatar: string };
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'rejected';
  duration: number;
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, initialized, initAuth, logout, updateUser } = useAuthStore();
  const { toggle: toggleTheme, theme } = useThemeStore();
  const { show: showToast } = useToastStore();

  const {
    connectSocket,
    onlineUserIds,
    typingUsers,
    setTyping,
    activeCall,
    outgoingCall,
    setIncomingCall,
    setOutgoingCall,
  } = useSocketStore();

  const {
    conversations,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    pinnedConversationIds,
    favoriteConversationIds,
    fetchConversations,
    selectConversation,
    sendMessage,
    createDirectConversation,
    createGroupConversation,
    toggleReaction,
    deleteMessage,
    togglePinConversation,
    toggleFavoriteConversation,
    updateGroupProfile,
  } = useChatStore();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'chats' | 'call' | 'updates' | 'profile'>('chats');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Favorites' | 'Work' | 'Groups' | 'Communities'>('All');
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'profile'>('list');

  // Messaging & Input
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; type: 'image' | 'file' | 'audio'; name: string } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Dynamic Data
  const [storiesGroups, setStoriesGroups] = useState<StoryGroup[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [loadingCalls, setLoadingCalls] = useState(false);

  // Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isPostStoryModalOpen, setIsPostStoryModalOpen] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);

  // Forms
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [lockChat, setLockChat] = useState(false);

  // Story Form
  const [storyInputType, setStoryInputType] = useState<'image' | 'text'>('image');
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [storyCaption, setStoryCaption] = useState('');
  const [storyBgGradient, setStoryBgGradient] = useState('linear-gradient(135deg, #EE673A, #FF8A64)');

  // Profile & Group Edit
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Group Profile Edit
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [groupEditName, setGroupEditName] = useState('');
  const [groupEditAvatar, setGroupEditAvatar] = useState('');
  const [groupEditDescription, setGroupEditDescription] = useState('');
  const [updatingGroupProfile, setUpdatingGroupProfile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const storyTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initial Auth & Socket
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (initialized) {
      if (!user) {
        router.push('/login');
      } else {
        connectSocket();
        fetchConversations();
        fetchStories();
        fetchCalls();
      }
    }
  }, [initialized, user, router, connectSocket, fetchConversations]);

  // Fetch Stories
  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const res = await api.get('/stories');
      const groups = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setStoriesGroups(groups);
    } catch (err) {
      // ignore
    } finally {
      setLoadingStories(false);
    }
  };

  // Fetch Call Logs
  const fetchCalls = async () => {
    setLoadingCalls(true);
    try {
      const res = await api.get('/calls');
      const logs = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setCallLogs(logs);
    } catch (err) {
      // ignore
    } finally {
      setLoadingCalls(false);
    }
  };

  const activeConversation = conversations.find((c) => c._id === activeConversationId);
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const activeTypingNames = activeConversationId
    ? (typingUsers[activeConversationId] || []).filter((name) => name !== user?.username)
    : [];

  // Scroll to bottom on new message or typing indicator
  useEffect(() => {
    if (activeConversationId && (messages[activeConversationId] || activeTypingNames.length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversationId, messages, activeTypingNames.length]);

  // Check if message is read by recipient
  const isMessageReadByRecipient = (msg?: Message, conv?: Conversation) => {
    if (!msg || !msg.readBy) return false;
    if (!conv) return msg.readBy.length > 1;

    const otherParticipants = conv.participants.filter((p) => p._id !== user?._id);
    if (otherParticipants.length === 0) return msg.readBy.length > 1;

    return otherParticipants.some((other) =>
      msg.readBy?.some((rId: any) => (typeof rId === 'object' ? rId._id === other._id : rId === other._id))
    );
  };

  // Helper to format last seen date accurately
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Offline';
    const date = new Date(lastSeen);
    if (isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) return `Last seen today at ${timeStr}`;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) return `Last seen yesterday at ${timeStr}`;

    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  // Conversation Details
  const getConversationDetails = (conv: Conversation) => {
    if (conv.type === 'group') {
      return {
        name: conv.name || 'Group Chat',
        avatar: conv.avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=256&q=80',
        statusText: `${conv.participants.length} members`,
        description: conv.description || '',
        isOnline: false,
      };
    } else {
      const other = conv.participants.find((p) => p._id !== user?._id) || conv.participants[0];
      const isOnline = other ? onlineUserIds.has(other._id) : false;
      return {
        name: other?.username || 'User',
        avatar: other?.avatar || '',
        statusText: isOnline ? 'Online' : formatLastSeen(other?.lastSeen),
        description: other?.bio || '',
        isOnline,
        otherUser: other,
      };
    }
  };

  // Search users
  const handleSearchUsers = async (val: string) => {
    setUserSearchInput(val);
    if (!val.trim()) {
      setUserSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/users?q=${encodeURIComponent(val)}`);
      setUserSearchResults(res.data);
    } catch (err) {
      setUserSearchResults([]);
    }
  };

  const handleStartDirectChat = async (recipientId: string) => {
    try {
      await createDirectConversation(recipientId);
      setIsNewChatModalOpen(false);
      setUserSearchInput('');
      setUserSearchResults([]);
      setActiveTab('chats');
      setMobileView('chat');
      showToast({ title: 'Chat opened', variant: 'info' });
    } catch (err: any) {
      showToast({ title: 'Failed to start chat', description: err.message, variant: 'error' });
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showToast({ title: 'Please enter a group name', variant: 'error' });
      return;
    }
    if (selectedGroupMembers.length === 0) {
      showToast({ title: 'Please select at least 1 member', variant: 'error' });
      return;
    }
    try {
      await createGroupConversation(groupName, selectedGroupMembers);
      setIsGroupModalOpen(false);
      setGroupName('');
      setSelectedGroupMembers([]);
      setFilterCategory('Groups');
      setActiveTab('chats');
      setMobileView('chat');
      showToast({ title: `Group "${groupName}" created!`, variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'Group creation failed', description: err.message, variant: 'error' });
    }
  };

  // Post Story Handler
  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyImageUrl && !storyCaption) {
      showToast({ title: 'Please select a photo or enter a caption', variant: 'error' });
      return;
    }
    try {
      await api.post('/stories', {
        mediaUrl: storyImageUrl,
        mediaType: storyImageUrl ? 'image' : 'text',
        caption: storyCaption,
        bgGradient: storyBgGradient,
      });
      showToast({ title: 'Story posted successfully!', variant: 'success' });
      setIsPostStoryModalOpen(false);
      setStoryImageUrl('');
      setStoryCaption('');
      await fetchStories();
    } catch (err: any) {
      showToast({ title: 'Failed to post story', description: err.message, variant: 'error' });
    }
  };

  // Open Story Viewer & Mark Viewed
  const openStoryViewer = (group: StoryGroup) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(0);

    // Immediately mark unviewed as false locally so ring turns viewed gray!
    setStoriesGroups((prev) =>
      prev.map((g) => (g.user._id === group.user._id ? { ...g, hasUnviewed: false } : g))
    );

    if (group.stories[0]) {
      api.post(`/stories/${group.stories[0]._id}/view`);
    }
  };

  // Auto-advance story timer
  useEffect(() => {
    if (activeStoryGroup) {
      storyTimerRef.current = setTimeout(() => {
        if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
          const nextIndex = activeStoryIndex + 1;
          setActiveStoryIndex(nextIndex);
          api.post(`/stories/${activeStoryGroup.stories[nextIndex]._id}/view`);
        } else {
          setActiveStoryGroup(null);
        }
      }, 4000);
    }
    return () => clearTimeout(storyTimerRef.current);
  }, [activeStoryGroup, activeStoryIndex]);

  // Instant zero-delay story navigation handlers
  const handleNextStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeStoryGroup) return;

    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);

    if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      setActiveStoryIndex(nextIdx);
      if (activeStoryGroup.stories[nextIdx]) {
        api.post(`/stories/${activeStoryGroup.stories[nextIdx]._id}/view`);
      }
    } else {
      // Find next story group in storiesGroups array
      const currentGroupIdx = storiesGroups.findIndex((g) => g.user._id === activeStoryGroup.user._id);
      if (currentGroupIdx >= 0 && currentGroupIdx < storiesGroups.length - 1) {
        const nextGroup = storiesGroups[currentGroupIdx + 1];
        setActiveStoryGroup(nextGroup);
        setActiveStoryIndex(0);
        if (nextGroup.stories[0]) {
          api.post(`/stories/${nextGroup.stories[0]._id}/view`);
        }
      } else {
        // Reached end of all stories
        setActiveStoryGroup(null);
      }
    }
  };

  const handlePrevStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeStoryGroup) return;

    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);

    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      // Move to previous user's story group
      const currentGroupIdx = storiesGroups.findIndex((g) => g.user._id === activeStoryGroup.user._id);
      if (currentGroupIdx > 0) {
        const prevGroup = storiesGroups[currentGroupIdx - 1];
        setActiveStoryGroup(prevGroup);
        setActiveStoryIndex(prevGroup.stories.length - 1);
      }
    }
  };

  // Message Input Handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (activeConversationId) {
      if (e.target.value.length > 0) {
        setTyping(activeConversationId, true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(activeConversationId, false);
        }, 3000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTyping(activeConversationId, false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachmentPreview) return;

    const contentToSend = messageInput.trim();
    const attachmentsToSend = attachmentPreview
      ? [
        {
          url: attachmentPreview.url,
          type: attachmentPreview.type as any,
          name: attachmentPreview.name,
          size: 1024 * 500,
        },
      ]
      : [];
    const replyId = replyingTo?._id;

    setMessageInput('');
    setAttachmentPreview(null);
    setReplyingTo(null);

    if (activeConversationId) {
      setTyping(activeConversationId, false);
      try {
        await sendMessage(contentToSend, attachmentsToSend, replyId);
      } catch (err: any) {
        showToast({ title: 'Failed to send message', description: err.message, variant: 'error' });
      }
    }
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultUrl = reader.result as string;
      setAttachmentPreview({
        url: resultUrl,
        type: isImg ? 'image' : isAudio ? 'audio' : 'file',
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Voice Note Recording
  const startRecordingVoice = async () => {
    setIsRecordingVoice(true);
    setRecordingTime(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
      }
    } catch (err) {
      console.warn('Microphone access denied or unavailable; fallback to synthetic voice blob.', err);
    }
  };

  const stopAndSendVoice = async () => {
    clearInterval(recordingTimerRef.current);

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            if (activeConversationId) {
              await sendMessage(`🎙️ Voice Note (${recordingTime}s)`, [
                {
                  url: base64Audio,
                  type: 'audio',
                  name: `Voice_Note_${recordingTime}s.mp3`,
                  size: audioBlob.size,
                },
              ]);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch (e) {
          console.error('Error reading recorded audio blob:', e);
        }

        // Stop microphone tracks
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
      };
      mediaRecorder.stop();
    } else {
      // Fallback synthetic playable audio data URL if browser mic unavailable
      if (activeConversationId) {
        await sendMessage(`🎙️ Voice Note (${recordingTime}s)`, [
          {
            url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
            type: 'audio',
            name: `Voice_Note_${recordingTime}s.mp3`,
            size: recordingTime * 4000,
          },
        ]);
      }
    }

    setIsRecordingVoice(false);
    setRecordingTime(0);
  };

  const cancelRecordingVoice = () => {
    clearInterval(recordingTimerRef.current);
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
      mediaRecorder.stop();
    }
    setIsRecordingVoice(false);
    setRecordingTime(0);
  };

  // Call Handling
  const startCall = async (callType: 'audio' | 'video', targetUserObj?: any) => {
    const target = targetUserObj || (activeConversation ? getConversationDetails(activeConversation).otherUser : null);
    if (!target) return;

    setOutgoingCall({
      targetUser: target,
      conversationId: activeConversation?._id || '',
      callType,
    });

    try {
      await api.post('/calls', {
        receiverId: target._id,
        type: callType,
        status: 'completed',
        duration: 120,
      });
      fetchCalls();
    } catch (e) {
      // ignore
    }
  };

  // Filter & Sort conversations (Pinned items stay at top)
  const filteredConversations = conversations
    .filter((c) => {
      const details = getConversationDetails(c);
      const matchesQuery = details.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterCategory === 'Favorites') return matchesQuery && favoriteConversationIds.includes(c._id);
      if (filterCategory === 'Groups') return matchesQuery && c.type === 'group';
      if (filterCategory === 'Work') return matchesQuery && c.type === 'direct';
      return matchesQuery;
    })
    .sort((a, b) => {
      const aPinned = pinnedConversationIds.includes(a._id) ? 1 : 0;
      const bPinned = pinnedConversationIds.includes(b._id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned; // Pinned items first!
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  const realMediaItems = currentMessages.flatMap((m) => m.attachments || []);

  // Robust deduplication of unique available users for group member selection
  const availableGroupUsers = (() => {
    const map = new Map<string, any>();
    conversations.forEach((c) => {
      if (!c.participants) return;
      c.participants.forEach((p: any) => {
        if (!p) return;
        const pId = typeof p === 'string' ? p : p._id || p.id;
        if (!pId || pId === user?._id) return;
        if (typeof p === 'object' && p.username) {
          const key = (p._id || p.id || p.username).toString();
          if (!map.has(key)) {
            map.set(key, p);
          }
        }
      });
    });
    return Array.from(map.values());
  })();

  const openEditGroupModal = () => {
    if (!activeConversation || activeConversation.type !== 'group') return;
    setGroupEditName(activeConversation.name || '');
    setGroupEditAvatar(activeConversation.avatar || '');
    setGroupEditDescription(activeConversation.description || '');
    setIsEditGroupModalOpen(true);
  };

  const handleSaveGroupProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;
    setUpdatingGroupProfile(true);
    try {
      await updateGroupProfile(activeConversation._id, {
        name: groupEditName,
        avatar: groupEditAvatar,
        description: groupEditDescription,
      });
      showToast({ title: 'Group details updated!', variant: 'success' });
      setIsEditGroupModalOpen(false);
    } catch (err: any) {
      showToast({ title: 'Failed to update group', description: err.message, variant: 'error' });
    } finally {
      setUpdatingGroupProfile(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await api.patch('/users/profile', { bio: bioInput });
      updateUser(res.data);
      setEditingBio(false);
      showToast({ title: 'Bio updated!', variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'Failed to update bio', description: err.message, variant: 'error' });
    }
  };

  const handleSaveAvatar = async (newUrl?: string) => {
    const targetUrl = newUrl || avatarInputUrl;
    if (!targetUrl.trim()) return;
    setUpdatingAvatar(true);
    try {
      const res = await api.patch('/users/profile', { avatar: targetUrl });
      updateUser(res.data.data || res.data);
      showToast({ title: 'Profile avatar updated!', variant: 'success' });
      setIsAvatarModalOpen(false);
    } catch (err: any) {
      showToast({ title: 'Failed to update avatar', description: err.response?.data?.message || err.message, variant: 'error' });
    } finally {
      setUpdatingAvatar(false);
    }
  };

  if (!initialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EE673A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full max-w-full bg-canvas text-text-primary overflow-hidden font-sans antialiased selection:bg-[#EE673A]/30">

      {/* ========================================================================= */}
      {/* 1. LEFT CONVERSATIONS & TABS PANEL */}
      {/* ========================================================================= */}
      <div
        className={`w-full md:w-96 flex-shrink-0 bg-surface border-r border-subtle flex flex-col h-full relative z-20 transition-all ${mobileView === 'list' ? 'flex' : 'hidden md:flex'
          }`}
      >
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary capitalize">
            {activeTab}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 rounded-full bg-sunken text-text-secondary hover:text-text-primary hover:bg-sunken/80 transition-colors"
              title="Search Users"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsPostStoryModalOpen(true)}
              className="p-2 rounded-full bg-sunken text-text-secondary hover:text-text-primary hover:bg-sunken/80 transition-colors"
              title="Post Story"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-sunken text-text-secondary hover:text-text-primary hover:bg-sunken/80 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
          </div>
        </div>

        {/* TAB 1: CHATS VIEW */}
        {activeTab === 'chats' && (
          <>
            {/* Stories Reels */}
            <div className="px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar flex-shrink-0">
              {/* "You" Add Story Button */}
              <div
                onClick={() => setIsPostStoryModalOpen(true)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-sunken border border-subtle flex items-center justify-center group-hover:border-[#EE673A] transition-colors">
                  <Avatar initials={user.username.slice(0, 2)} src={user.avatar} size="md" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#EE673A] flex items-center justify-center text-white text-xs font-bold border-2 border-surface">
                    +
                  </div>
                </div>
                <span className="text-[11px] font-medium text-text-secondary">You</span>
              </div>

              {/* Story Reels: Coral Ring for Unviewed, Muted Gray Border for Viewed */}
              {storiesGroups.map((group) => (
                <div
                  key={group.user._id}
                  onClick={() => openStoryViewer(group)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                >
                  <div className={group.hasUnviewed ? 'story-ring' : 'p-0.5 rounded-full border border-subtle opacity-70'}>
                    <div className="w-13 h-13 rounded-full overflow-hidden p-0.5 bg-surface">
                      <Avatar initials={group.user.username.slice(0, 2)} src={group.user.avatar} size="md" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary truncate w-14 text-center">
                    {group.user.username}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter Category Chips */}
            <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
              {(['All', 'Favorites', 'Work', 'Groups', 'Communities'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filterCategory === cat
                      ? 'bg-[#EE673A] text-white shadow-lg shadow-[#EE673A]/25'
                      : 'bg-sunken text-text-secondary hover:text-text-primary hover:bg-sunken/80'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="px-4 py-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl bg-sunken pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-tertiary border border-subtle focus:outline-none focus:border-[#EE673A] transition-colors"
                />
              </div>
            </div>

            {/* Conversation Items Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-subtle custom-scrollbar px-2 mt-2">
              {loadingConversations ? (
                <div className="p-6 text-center text-xs text-text-tertiary">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <MessageSquare className="w-8 h-8 mx-auto text-text-tertiary opacity-40" />
                  <p className="text-xs text-text-tertiary">No chats found</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const details = getConversationDetails(conv);
                  const isSelected = conv._id === activeConversationId;
                  const isPinned = pinnedConversationIds.includes(conv._id);
                  const isFavorite = favoriteConversationIds.includes(conv._id);
                  const unread = conv.unreadCounts?.[user._id] || 0;
                  const isTyping = (typingUsers[conv._id] || []).length > 0;
                  const isLastMessageRead = isMessageReadByRecipient(conv.lastMessage, conv);

                  return (
                    <SwipeableChatItem
                      key={conv._id}
                      isPinned={isPinned}
                      isFavorite={isFavorite}
                      onSelect={() => {
                        selectConversation(conv._id);
                        setMobileView('chat');
                      }}
                      onTogglePin={() => {
                        togglePinConversation(conv._id);
                        showToast({
                          title: isPinned ? 'Chat Unpinned' : 'Chat Pinned to Top',
                          variant: 'info',
                        });
                      }}
                      onToggleFavorite={() => {
                        toggleFavoriteConversation(conv._id);
                        showToast({
                          title: isFavorite ? 'Removed from Favorites' : 'Added to Favorites section',
                          variant: 'success',
                        });
                      }}
                    >
                      <div
                        className={`w-full p-3 rounded-2xl flex items-center gap-3.5 text-left transition-all relative ${isSelected
                            ? 'bg-sunken border-2 border-[#EE673A] shadow-md shadow-[#EE673A]/15'
                            : isPinned
                              ? 'bg-sunken/40 border-l-4 border-l-[#EE673A] border-y border-r border-subtle'
                              : isFavorite
                                ? 'bg-sunken/30 border-r-2 border-r-rose-500/80 border-l border-y border-subtle'
                                : 'bg-surface border border-subtle/80 hover:border-[#EE673A]/40 hover:bg-sunken/50'
                          }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar initials={details.name.slice(0, 2)} src={details.avatar} size="md" />
                          {details.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#EE673A] border-2 border-surface" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="font-semibold text-xs text-text-primary truncate">{details.name}</h3>
                              {isPinned && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#EE673A]/15 text-[#EE673A] text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                                  <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                              )}
                              {isFavorite && (
                                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
                              )}
                            </div>
                            {conv.updatedAt && (
                              <span className="text-[10px] text-text-tertiary flex-shrink-0">
                                {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-text-secondary truncate flex items-center gap-1">
                              {isTyping ? (
                                <span className="text-[#EE673A] font-semibold flex items-center gap-1.5">
                                  <span>Typing</span>
                                  <TypingDots size="sm" />
                                </span>
                              ) : (
                                <>
                                  {/* Single Gray Check when Unread, Double Blue Check ONLY when Read! */}
                                  {conv.lastMessage?.sender?._id === user._id && (
                                    isLastMessageRead ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-text-tertiary inline shrink-0" />
                                    )
                                  )}
                                  {conv.lastMessage?.isDeleted || conv.lastMessage?.content === 'This message was deleted' ? (
                                    <span className="truncate italic text-text-tertiary inline-flex items-center gap-1">
                                      <Ban className="w-3 h-3 inline shrink-0 opacity-70" />
                                      This message was deleted
                                    </span>
                                  ) : (
                                    <span className="truncate">{conv.lastMessage?.content || 'No messages yet'}</span>
                                  )}
                                </>
                              )}
                            </p>
                            {unread > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EE673A] text-white animate-bounce shadow-md shadow-[#EE673A]/40">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </SwipeableChatItem>
                  );
                })
              )}
            </div>

            {/* Floating Action Button (FAB) for Creating Group - Elevated above bottom line */}
            <button
              onClick={() => {
                setGroupName('');
                setSelectedGroupMembers([]);
                setIsGroupModalOpen(true);
              }}
              className="absolute bottom-28 right-4 z-30 p-3.5 rounded-2xl bg-gradient-to-tr from-[#EE673A] to-[#FF8A64] text-white shadow-xl shadow-[#EE673A]/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-white/20 cursor-pointer"
              title="Create Group Chat"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </>
        )}

        {/* TAB 2: CALL LOGS VIEW */}
        {activeTab === 'call' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Recent Call Logs</h2>
            {loadingCalls ? (
              <div className="p-6 text-center text-xs text-text-tertiary">Loading calls...</div>
            ) : callLogs.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Phone className="w-8 h-8 mx-auto text-text-tertiary opacity-40" />
                <p className="text-xs text-text-tertiary">No call history yet</p>
              </div>
            ) : (
              callLogs.map((log) => {
                const isCaller = log.caller?._id === user._id;
                const peer = isCaller ? log.receiver : log.caller;
                return (
                  <div
                    key={log._id}
                    className="p-3 rounded-2xl bg-sunken border border-subtle flex items-center justify-between hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar initials={(peer?.username || 'U').slice(0, 2)} src={peer?.avatar} size="md" />
                      <div>
                        <h4 className="font-semibold text-xs text-text-primary">{peer?.username}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary mt-0.5">
                          {log.status === 'missed' ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-red-400" />
                          ) : isCaller ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {log.duration > 0 && <span>({Math.floor(log.duration / 60)}m)</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => startCall(log.type, peer)}
                      className="p-2.5 rounded-full bg-[#EE673A]/10 text-[#EE673A] hover:bg-[#EE673A] hover:text-white transition-all"
                      title="Redial"
                    >
                      {log.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: UPDATES / STORIES VIEW */}
        {activeTab === 'updates' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Create Story Banner */}
            <div
              onClick={() => setIsPostStoryModalOpen(true)}
              className="p-4 rounded-2xl bg-gradient-to-r from-[#EE673A]/20 to-[#FF8A64]/10 border border-[#EE673A]/30 flex items-center justify-between cursor-pointer hover:border-[#EE673A] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EE673A] text-white flex items-center justify-center font-bold text-xl">
                  +
                </div>
                <div>
                  <h3 className="font-bold text-xs text-text-primary">Post Status Update</h3>
                  <p className="text-[11px] text-text-tertiary">Share a photo or message for 24 hours</p>
                </div>
              </div>
              <Camera className="w-5 h-5 text-[#EE673A]" />
            </div>

            {/* Updates Feed */}
            <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Recent Statuses</h2>
            {loadingStories ? (
              <div className="p-6 text-center text-xs text-text-tertiary">Loading updates...</div>
            ) : storiesGroups.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-text-tertiary opacity-40" />
                <p className="text-xs text-text-tertiary">No recent updates</p>
              </div>
            ) : (
              storiesGroups.map((group) => (
                <div
                  key={group.user._id}
                  onClick={() => openStoryViewer(group)}
                  className="p-3.5 rounded-2xl bg-sunken border border-subtle flex items-center justify-between cursor-pointer hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={group.hasUnviewed ? 'story-ring' : 'p-0.5 rounded-full border border-subtle opacity-60'}>
                      <div className="w-11 h-11 rounded-full overflow-hidden p-0.5 bg-surface">
                        <Avatar initials={group.user.username.slice(0, 2)} src={group.user.avatar} size="md" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-text-primary">{group.user.username}</h4>
                      <p className="text-[11px] text-text-tertiary">{group.stories.length} story updates</p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-[#EE673A]" />
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            <div className="text-center space-y-3">
              <div
                className="relative inline-block mx-auto cursor-pointer group"
                onClick={() => {
                  setAvatarInputUrl(user.avatar || '');
                  setIsAvatarModalOpen(true);
                }}
              >
                <Avatar
                  initials={user.username.slice(0, 2)}
                  src={user.avatar}
                  size="xl"
                  className="mx-auto border-2 border-[#EE673A] transition-transform group-hover:scale-105"
                />
                <div
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-[#EE673A] text-white shadow-lg group-hover:scale-110 transition-all border-2 border-surface"
                  title="Change Avatar"
                >
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-text-primary">{user.username}</h3>
                <p className="text-xs text-text-tertiary">{user.email}</p>
              </div>

              <div className="p-3 rounded-2xl bg-sunken border border-subtle text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>Bio / Status</span>
                  {!editingBio ? (
                    <button onClick={() => { setEditingBio(true); setBioInput(user.bio || ''); }} className="text-[#EE673A] font-semibold">
                      Edit
                    </button>
                  ) : (
                    <button onClick={handleSaveBio} className="text-emerald-400 font-semibold">
                      Save
                    </button>
                  )}
                </div>
                {!editingBio ? (
                  <p className="text-xs text-text-primary">{user.bio || 'No bio set'}</p>
                ) : (
                  <input
                    type="text"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-surface px-3 py-1.5 text-xs text-text-primary rounded-xl border border-[#EE673A] focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-sunken border border-subtle text-center">
                <span className="text-[10px] text-text-tertiary block">Chats</span>
                <span className="font-bold text-xs text-text-primary">{conversations.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-sunken border border-subtle text-center">
                <span className="text-[10px] text-text-tertiary block">Calls</span>
                <span className="font-bold text-xs text-text-primary">{callLogs.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-sunken border border-subtle text-center">
                <span className="text-[10px] text-text-tertiary block">Stories</span>
                <span className="font-bold text-xs text-text-primary">{storiesGroups.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={logout}
                className="w-full p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out of Account
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom Navigation Bar */}
        <nav className="py-3 px-4 bg-surface/90 backdrop-blur-md border-t border-subtle flex items-center justify-around relative">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${activeTab === 'chats' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-text-primary'
              }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('call')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${activeTab === 'call' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-text-primary'
              }`}
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px]">Call</span>
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${activeTab === 'updates' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-text-primary'
              }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px]">Updates</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${activeTab === 'profile' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-text-primary'
              }`}
          >
            <Avatar initials={user.username.slice(0, 2)} src={user.avatar} size="sm" />
            <span className="text-[10px]">Profile</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT VIEW */}
      {/* ========================================================================= */}
      {activeConversation ? (
        <main
          className={`flex-1 flex flex-col h-full bg-canvas relative z-10 transition-all ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'
            }`}
        >
          {/* Header */}
          <header className="p-3.5 border-b border-subtle bg-surface/90 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-sunken"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {(() => {
                const details = getConversationDetails(activeConversation);
                const isGroup = activeConversation.type === 'group';

                return (
                  <div
                    onClick={() => isGroup && openEditGroupModal()}
                    className={`flex items-center gap-3 ${isGroup ? 'cursor-pointer group/header hover:opacity-90 transition-opacity' : ''
                      }`}
                    title={isGroup ? 'Click to edit Group Avatar & Description' : ''}
                  >
                    <div className="relative">
                      <Avatar initials={details.name.slice(0, 2)} src={details.avatar} size="md" />
                      {isGroup && (
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#EE673A] text-white opacity-0 group-hover/header:opacity-100 transition-opacity shadow-sm">
                          <Camera className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-sm text-text-primary flex items-center gap-1.5">
                        <span>{details.name}</span>
                        {isGroup && (
                          <span className="text-[9px] text-[#EE673A] font-semibold bg-[#EE673A]/10 border border-[#EE673A]/20 px-1.5 py-0.5 rounded-md">
                            Edit
                          </span>
                        )}
                      </h2>
                      <p className="text-[11px] text-text-secondary truncate max-w-xs">
                        {activeTypingNames.length > 0 ? (
                          <span className="text-[#EE673A] font-semibold flex items-center gap-1.5">
                            <span>{activeTypingNames.join(', ')} is typing</span>
                            <TypingDots size="sm" />
                          </span>
                        ) : isGroup && details.description ? (
                          <span className="truncate">{details.description} • {details.statusText}</span>
                        ) : (
                          details.statusText
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => startCall('audio')}
                className="p-2.5 rounded-xl hover:bg-sunken text-text-secondary hover:text-[#EE673A] transition-colors"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startCall('video')}
                className="p-2.5 rounded-xl hover:bg-sunken text-text-secondary hover:text-[#EE673A] transition-colors"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowRightSidebar(!showRightSidebar);
                  setMobileView('profile');
                }}
                className={`p-2.5 rounded-xl transition-colors ${showRightSidebar ? 'bg-[#EE673A]/20 text-[#EE673A]' : 'hover:bg-sunken text-text-secondary'
                  }`}
                title="Info"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full text-xs text-text-tertiary">
                Loading messages...
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
                <MessageSquare className="w-12 h-12 text-[#EE673A]" />
                <h3 className="text-sm font-semibold text-text-primary">No messages yet</h3>
                <p className="text-xs text-text-tertiary">Start the real-time conversation!</p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const isMe = msg.sender?._id === user._id;
                const isRead = isMessageReadByRecipient(msg, activeConversation);
                const isDeletedMsg = msg.isDeleted || msg.content === 'This message was deleted';

                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative my-1.5`}
                  >
                    {!isMe && activeConversation.type === 'group' && (
                      <span className="text-[10px] font-semibold text-text-tertiary mb-1 ml-2.5">
                        {msg.sender?.username}
                      </span>
                    )}

                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[72%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Message Bubble Container */}
                      <div className="flex flex-col space-y-1 min-w-0">
                        {/* Reply card reference */}
                        {msg.replyTo && (
                          <div
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.replyTo?._id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className={`cursor-pointer text-xs p-3 rounded-[20px] transition-all border shadow-sm ${isMe
                              ? 'bg-[#EE673A]/15 border-[#EE673A]/30 text-text-primary rounded-br-[6px]'
                              : 'bg-sunken border-subtle text-text-primary rounded-bl-[6px]'
                              }`}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#EE673A] mb-0.5">
                              <Reply className="w-3 h-3 rotate-180" />
                              <span>@{msg.replyTo.sender?.username || 'user'}</span>
                            </div>
                            <p className="text-xs opacity-90 truncate max-w-xs">{msg.replyTo.content}</p>
                          </div>
                        )}

                        {/* Main Message Bubble */}
                        {isDeletedMsg ? (
                          <div
                            className={`px-4 py-2.5 text-xs rounded-[22px] border flex items-center gap-2 shadow-sm transition-all ${isMe
                              ? 'bg-sunken/80 border-subtle text-text-tertiary rounded-br-[4px]'
                              : 'bg-surface border-subtle text-text-tertiary rounded-bl-[4px]'
                              }`}
                          >
                            <Ban className="w-3.5 h-3.5 text-text-tertiary/70 shrink-0" />
                            <span className="italic font-normal opacity-85">This message was deleted</span>
                            <span className="text-[10px] text-text-tertiary/60 ml-2 self-end">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div
                            id={`msg-${msg._id}`}
                            className={`px-4 py-2.5 text-xs space-y-1.5 shadow-md transition-all ${isMe
                              ? 'bg-gradient-to-r from-[#EE673A] to-[#FF7A50] text-white rounded-[22px] rounded-br-[4px] border border-[#EE673A]/20 shadow-[#EE673A]/15'
                              : 'bg-surface text-text-primary rounded-[22px] rounded-bl-[4px] border border-subtle backdrop-blur-md'
                              }`}
                          >
                            {/* Content text */}
                            <p className="whitespace-pre-wrap leading-relaxed font-normal text-xs">{msg.content}</p>

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="pt-1.5 space-y-2">
                                {msg.attachments.map((att, i) => {
                                  const isAudio =
                                    att.type === 'audio' ||
                                    (att.name && /\.(mp3|wav|ogg|m4a|webm)$/i.test(att.name)) ||
                                    (att.url && att.url.startsWith('data:audio'));

                                  return (
                                    <div key={i} className="rounded-2xl overflow-hidden relative">
                                      {att.type === 'image' ? (
                                        <div className="relative border border-subtle rounded-2xl overflow-hidden">
                                          <img
                                            src={att.url}
                                            alt={att.name}
                                            className="max-h-64 w-full object-cover rounded-2xl"
                                          />
                                        </div>
                                      ) : isAudio ? (
                                        <AudioPlayer src={att.url} name={att.name || 'Voice Note'} isMe={isMe} />
                                      ) : (
                                        <a
                                          href={att.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`flex items-center gap-2 p-3 rounded-xl text-xs border ${isMe ? 'bg-black/20 border-white/10 text-white' : 'bg-sunken border-subtle text-text-primary'
                                            }`}
                                        >
                                          <FileText className="w-4 h-4 text-[#EE673A]" />
                                          <span className="truncate font-medium">{att.name}</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Timestamp & Read Receipts */}
                            <div
                              className={`flex items-center justify-end gap-1.5 text-[10px] pt-0.5 ${isMe ? 'text-white/85' : 'text-text-tertiary'
                                }`}
                            >
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (
                                isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-white/70" />
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hover Action Buttons */}
                      {!isDeletedMsg && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity mb-1 shrink-0">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="p-1.5 rounded-full hover:bg-sunken text-text-tertiary hover:text-[#EE673A] transition-colors"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(msg._id)}
                              className="p-1.5 rounded-full hover:bg-red-500/10 text-text-tertiary hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {/* Real-time typing bubble animation */}
            <TypingIndicator
              typingUsers={activeTypingNames}
              avatar={
                activeConversation.participants?.find((p) => p.username === activeTypingNames[0])?.avatar ||
                getConversationDetails(activeConversation).avatar
              }
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="px-4 py-2 bg-surface border-t border-subtle flex items-center justify-between text-xs text-text-primary">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4 text-[#EE673A]" />
                <span>
                  Replying to <strong className="text-text-primary">@{replyingTo.sender?.username}</strong>: &quot;
                  {replyingTo.content}&quot;
                </span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-text-tertiary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachment Preview Banner */}
          {attachmentPreview && (
            <div className="px-4 py-3 bg-surface border-t border-subtle flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                {attachmentPreview.type === 'image' ? (
                  <div className="relative flex-shrink-0 group">
                    <img
                      src={attachmentPreview.url}
                      alt={attachmentPreview.name}
                      className="w-14 h-14 object-cover rounded-xl border border-subtle shadow-md"
                    />
                  </div>
                ) : attachmentPreview.type === 'audio' ? (
                  <div className="w-10 h-10 rounded-xl bg-[#EE673A]/20 border border-[#EE673A]/30 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-5 h-5 text-[#EE673A]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-sunken border border-subtle flex items-center justify-center flex-shrink-0">
                    <Paperclip className="w-5 h-5 text-[#EE673A]" />
                  </div>
                )}

                <div className="min-w-0">
                  <span className="font-semibold text-text-primary block truncate max-w-xs">
                    {attachmentPreview.name}
                  </span>
                  <span className="text-[10px] text-text-tertiary block capitalize">
                    {attachmentPreview.type === 'image' ? 'Photo attachment ready to send' : `${attachmentPreview.type} attachment`}
                  </span>
                </div>
              </div>

              {/* Cross (X) delete/cancel button */}
              <button
                type="button"
                onClick={() => setAttachmentPreview(null)}
                className="p-2 rounded-full bg-sunken hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors ml-3"
                title="Remove attachment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <footer className="p-3 bg-surface/90 backdrop-blur-xl border-t border-subtle">
            {isRecordingVoice ? (
              <div className="flex items-center justify-between bg-sunken border border-red-500/30 rounded-full px-4 py-2 text-xs text-red-400">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>Recording voice message... ({recordingTime}s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelRecordingVoice}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={stopAndSendVoice}>
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex-1 flex items-center bg-sunken rounded-full px-4 py-1.5 border border-subtle focus-within:border-[#EE673A] transition-colors">
                  <input
                    type="text"
                    placeholder="Type here..."
                    value={messageInput}
                    onChange={handleInputChange}
                    className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startRecordingVoice}
                  className="p-3 rounded-full bg-sunken text-text-tertiary hover:text-text-primary hover:bg-sunken/80 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-full bg-[#EE673A] text-white shadow-lg shadow-[#EE673A]/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </footer>
        </main>
      ) : (
        /* Empty state */
        <main className="hidden md:flex flex-1 flex-col items-center justify-center bg-canvas text-center p-8 space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#EE673A] to-[#FF8A64] flex items-center justify-center shadow-2xl shadow-[#EE673A]/20">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display font-bold text-2xl text-text-primary">Select a Chat to Start Messaging</h2>
          <p className="text-xs text-text-secondary max-w-sm">
            Choose a conversation from the sidebar or click (+) to start a new chat with real-time updates.
          </p>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. RIGHT PROFILE SIDEBAR */}
      {/* ========================================================================= */}
      {(showRightSidebar || mobileView === 'profile') && (
        <aside className="w-full md:w-80 flex-shrink-0 bg-surface border-l border-subtle p-5 flex flex-col h-full z-30 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowRightSidebar(false);
                setMobileView('list');
              }}
              className="p-1 text-text-tertiary hover:text-text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-full bg-sunken text-red-400 hover:bg-red-500/10"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Header */}
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <Avatar
                initials={(activeConversation ? getConversationDetails(activeConversation).name : user.username).slice(0, 2)}
                src={activeConversation ? getConversationDetails(activeConversation).avatar : user.avatar}
                size="xl"
                className="mx-auto border-2 border-[#EE673A]"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#EE673A] border-2 border-surface" />
            </div>
            <h3 className="font-display font-bold text-lg text-text-primary">
              {activeConversation ? getConversationDetails(activeConversation).name : user.username}
            </h3>
            <p className="text-xs text-text-tertiary">
              {activeConversation ? getConversationDetails(activeConversation).statusText : user.email}
            </p>
            {activeConversation ? (
              getConversationDetails(activeConversation).description && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block mb-1">About / Bio</span>
                  <p className="text-xs text-text-secondary italic px-3 py-1.5 bg-sunken rounded-xl border border-subtle inline-block max-w-full break-words">
                    "{getConversationDetails(activeConversation).description}"
                  </p>
                </div>
              )
            ) : (
              user.bio && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block mb-1">About / Bio</span>
                  <p className="text-xs text-text-secondary italic px-3 py-1.5 bg-sunken rounded-xl border border-subtle inline-block max-w-full break-words">
                    "{user.bio}"
                  </p>
                </div>
              )
            )}
          </div>

          {/* Dynamic Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-sunken border border-subtle text-center">
              <span className="text-[10px] text-text-tertiary block">Messages</span>
              <span className="font-bold text-xs text-text-primary">{currentMessages.length || conversations.length * 15}</span>
            </div>
            <div className="p-3 rounded-2xl bg-sunken border border-subtle text-center">
              <span className="text-[10px] text-text-tertiary block">Group</span>
              <span className="font-bold text-xs text-text-primary">{conversations.filter(c => c.type === 'group').length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-sunken border border-subtle text-center">
              <span className="text-[10px] text-text-tertiary block">Media</span>
              <span className="font-bold text-xs text-text-primary">{realMediaItems.length}</span>
            </div>
          </div>

          {/* Dynamic Media Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary">Media and photos</span>
              <span className="text-[10px] text-text-tertiary">{realMediaItems.length} files</span>
            </div>
            {realMediaItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {realMediaItems.slice(0, 3).map((item, i) => (
                  <img
                    key={i}
                    src={item.url}
                    alt={item.name}
                    className="h-16 w-full object-cover rounded-xl border border-subtle"
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-sunken text-center text-xs text-text-tertiary">
                No media shared in this chat
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sunken border border-subtle hover:bg-surface transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-text-primary">Notification</span>
              </div>
              <ChevronLeft className="w-4 h-4 rotate-180 text-text-tertiary" />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sunken border border-subtle hover:bg-surface transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-text-primary">Media visibility</span>
              </div>
              <ChevronLeft className="w-4 h-4 rotate-180 text-text-tertiary" />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sunken border border-subtle">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-text-primary">Lock Chat</span>
              </div>
              <button
                onClick={() => setLockChat(!lockChat)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${lockChat ? 'bg-[#EE673A]' : 'bg-surface border border-subtle'
                  }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${lockChat ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ----------------- MODAL: POST STORY ----------------- */}
      <Modal open={isPostStoryModalOpen} onClose={() => setIsPostStoryModalOpen(false)} title="Post Status Update">
        <form onSubmit={handlePostStory} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStoryInputType('image')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border ${storyInputType === 'image'
                  ? 'bg-[#EE673A] text-white border-[#EE673A]'
                  : 'bg-sunken text-text-tertiary border-subtle'
                }`}
            >
              Photo Story
            </button>
            <button
              type="button"
              onClick={() => setStoryInputType('text')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border ${storyInputType === 'text'
                  ? 'bg-[#EE673A] text-white border-[#EE673A]'
                  : 'bg-sunken text-text-tertiary border-subtle'
                }`}
            >
              Text Story
            </button>
          </div>

          {storyInputType === 'image' ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-tertiary uppercase">Select Photo or Enter Image URL</label>

              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer p-3 rounded-2xl bg-sunken border border-dashed border-subtle hover:border-[#EE673A] text-center text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4 text-[#EE673A]" />
                  <span>Choose Photo File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setStoryImageUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="relative flex items-center justify-center my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-subtle" />
                </div>
                <span className="relative bg-surface px-2 text-[10px] text-text-tertiary uppercase">or paste image URL</span>
              </div>

              <Input
                placeholder="https://images.unsplash.com/..."
                value={storyImageUrl}
                onChange={(e) => setStoryImageUrl(e.target.value)}
              />

              {storyImageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-40 bg-black/40 flex items-center justify-center p-2">
                  <img
                    src={storyImageUrl}
                    alt="Story Preview"
                    className="max-h-36 object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setStoryImageUrl('')}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-tertiary uppercase">Background Style</label>
              <div className="flex gap-2">
                {[
                  'linear-gradient(135deg, #EE673A, #FF8A64)',
                  'linear-gradient(135deg, #7C5CFC, #FF5CAA)',
                  'linear-gradient(135deg, #10B981, #059669)',
                  'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                ].map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStoryBgGradient(grad)}
                    style={{ background: grad }}
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                  />
                ))}
              </div>
            </div>
          )}

          <Input
            label="Caption / Text"
            placeholder="What's on your mind?"
            value={storyCaption}
            onChange={(e) => setStoryCaption(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsPostStoryModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Post Update</Button>
          </div>
        </form>
      </Modal>

      {/* ----------------- FULLSCREEN STORY VIEWER MODAL ----------------- */}
      {activeStoryGroup && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none">
          <div
            className="w-full max-w-sm h-[80vh] rounded-3xl overflow-hidden relative flex flex-col justify-between p-6 shadow-2xl border border-white/10"
            style={{
              background: activeStoryGroup.stories[activeStoryIndex]?.bgGradient || '#1C1615',
            }}
          >
            {/* Tap zones for zero-delay instant prev/next story navigation */}
            <div className="absolute inset-0 z-10 flex">
              <div
                onClick={handlePrevStory}
                className="w-1/2 h-full cursor-pointer opacity-0 hover:bg-white/5 transition-opacity"
                title="Tap left for previous story"
              />
              <div
                onClick={handleNextStory}
                className="w-1/2 h-full cursor-pointer opacity-0 hover:bg-white/5 transition-opacity"
                title="Tap right for next story"
              />
            </div>

            {/* Story Progress Bar */}
            <div className="flex gap-1.5 absolute top-4 left-4 right-4 z-20 pointer-events-none">
              {activeStoryGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${i === activeStoryIndex ? 'w-full' : i < activeStoryIndex ? 'w-full' : 'w-0'
                      }`}
                  />
                </div>
              ))}
            </div>

            {/* Top User Badge */}
            <div className="flex items-center justify-between pt-4 relative z-20">
              <div className="flex items-center gap-3">
                <Avatar initials={activeStoryGroup.user.username.slice(0, 2)} src={activeStoryGroup.user.avatar} size="md" />
                <div>
                  <h4 className="font-bold text-sm text-white">{activeStoryGroup.user.username}</h4>
                  <span className="text-[10px] text-white/80">
                    {new Date(activeStoryGroup.stories[activeStoryIndex]?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStoryGroup(null);
                }}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Story Content */}
            <div className="flex-1 flex flex-col items-center justify-center my-6 relative z-10 text-center pointer-events-none">
              {activeStoryGroup.stories[activeStoryIndex]?.mediaUrl && (
                <img
                  src={activeStoryGroup.stories[activeStoryIndex].mediaUrl}
                  alt="Story"
                  className="max-h-96 w-full object-contain rounded-2xl shadow-xl border border-white/10"
                />
              )}
              {activeStoryGroup.stories[activeStoryIndex]?.caption && (
                <p className="text-base font-bold text-white mt-4 drop-shadow-md px-4">
                  {activeStoryGroup.stories[activeStoryIndex].caption}
                </p>
              )}
            </div>

            {/* Bottom Views Footer - ONLY story owner can see view count & viewers list */}
            <div className="flex items-center justify-between text-xs text-white/80 pt-2 border-t border-white/10 relative z-20">
              {activeStoryGroup.user._id === user._id ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsViewersModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all border border-white/10 cursor-pointer group"
                  title="Click to view story viewers list"
                >
                  <Eye className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-xs">
                    {activeStoryGroup.stories[activeStoryIndex]?.views?.length || 0} views
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-white/75 font-medium">
                  <span>Status update</span>
                </div>
              )}
              <span className="text-[10px] opacity-70">Tap right for next</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: STORY VIEWERS (STORY CREATOR ONLY) ----------------- */}
      <Modal
        open={isViewersModalOpen && activeStoryGroup?.user._id === user._id}
        onClose={() => setIsViewersModalOpen(false)}
        title="Story Viewers"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="text-xs font-semibold text-text-tertiary uppercase">Viewed by</span>
            <span className="text-xs font-bold text-[#EE673A]">
              {activeStoryGroup?.stories[activeStoryIndex]?.views?.length || 0} people
            </span>
          </div>

          {(!activeStoryGroup?.stories[activeStoryIndex]?.views || activeStoryGroup.stories[activeStoryIndex].views.length === 0) ? (
            <div className="p-8 text-center space-y-2">
              <Eye className="w-8 h-8 mx-auto text-text-tertiary opacity-40" />
              <p className="text-xs text-text-tertiary">No views yet. Share your status update with friends!</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2.5 custom-scrollbar">
              {activeStoryGroup.stories[activeStoryIndex].views.map((viewer: any, idx: number) => {
                const vUser = typeof viewer === 'object' ? viewer : { _id: viewer, username: 'User', avatar: '' };
                return (
                  <div
                    key={vUser._id || idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-sunken border border-subtle"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar initials={(vUser.username || 'U').slice(0, 2)} src={vUser.avatar} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-text-primary">{vUser.username || 'User'}</div>
                        <div className="text-[10px] text-text-tertiary">{vUser.email || 'Viewed status'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-1 rounded-full border border-cyan-500/20">
                      <Eye className="w-3 h-3" /> Seen
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ----------------- MODAL: START DIRECT CHAT ----------------- */}
      <Modal open={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} title="Start New Chat">
        <div className="space-y-4">
          <Input
            placeholder="Search registered user by name..."
            value={userSearchInput}
            onChange={(e) => handleSearchUsers(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto space-y-2">
            {userSearchResults.map((u) => (
              <button
                key={u._id}
                onClick={() => handleStartDirectChat(u._id)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-sunken transition-colors border border-subtle text-left"
              >
                <div className="flex items-center gap-3">
                  <Avatar initials={u.username.slice(0, 2)} src={u.avatar} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-text-primary">{u.username}</div>
                    <div className="text-[10px] text-text-tertiary">{u.email}</div>
                  </div>
                </div>
                <Button size="sm" variant="primary">Message</Button>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* ----------------- MODAL: CREATE GROUP ----------------- */}
      <Modal open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Create Group Chat">
        <div className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Design Team"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <div className="space-y-2">
            <Input
              placeholder="Search user by name to add..."
              value={userSearchInput}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase flex items-center justify-between">
              <span>Select Group Members</span>
              <span className="text-[10px] text-[#EE673A] font-bold">{selectedGroupMembers.length} selected</span>
            </label>

            <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
              {userSearchInput.trim() && userSearchResults.length > 0 ? (
                userSearchResults.map((u) => {
                  if (u._id === user._id) return null;
                  const isSelected = selectedGroupMembers.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== u._id));
                        } else {
                          setSelectedGroupMembers([...selectedGroupMembers, u._id]);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${isSelected
                          ? 'border-[#EE673A] bg-[#EE673A]/10'
                          : 'border-subtle hover:bg-sunken'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar initials={u.username.slice(0, 2)} src={u.avatar} size="sm" />
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{u.username}</div>
                          <div className="text-[10px] text-text-tertiary">{u.email}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#EE673A]" />}
                    </button>
                  );
                })
              ) : (
                availableGroupUsers.map((other) => {
                  const isSelected = selectedGroupMembers.includes(other._id);
                  return (
                    <button
                      key={other._id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== other._id));
                        } else {
                          setSelectedGroupMembers([...selectedGroupMembers, other._id]);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${isSelected
                          ? 'border-[#EE673A] bg-[#EE673A]/10'
                          : 'border-subtle hover:bg-sunken'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar initials={other.username.slice(0, 2)} src={other.avatar} size="sm" />
                        <span className="text-xs font-semibold text-text-primary">{other.username}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#EE673A]" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateGroup}>Create Group</Button>
          </div>
        </div>
      </Modal>

      {/* ----------------- MODAL: EDIT GROUP PROFILE ----------------- */}
      <Modal open={isEditGroupModalOpen} onClose={() => setIsEditGroupModalOpen(false)} title="Edit Group Profile">
        <form onSubmit={handleSaveGroupProfile} className="space-y-4">
          <div className="text-center space-y-3">
            <div className="relative inline-block mx-auto">
              <Avatar
                initials={groupEditName.slice(0, 2) || 'GP'}
                src={groupEditAvatar}
                size="xl"
                className="mx-auto border-2 border-[#EE673A]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-tertiary uppercase block">Choose Group Avatar</label>

              {/* Preset Avatars */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${groupEditName || 'group'}1`,
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${groupEditName || 'group'}2`,
                  `https://api.dicebear.com/7.x/shapes/svg?seed=${groupEditName || 'group'}3`,
                  `https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=256&q=80`,
                ].map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGroupEditAvatar(url)}
                    className={`p-1.5 rounded-xl border transition-all ${groupEditAvatar === url ? 'border-[#EE673A] bg-[#EE673A]/10 scale-105' : 'border-subtle hover:bg-sunken'
                      }`}
                  >
                    <img src={url} alt={`Group Preset ${i}`} className="w-10 h-10 rounded-lg mx-auto object-cover" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer p-2.5 rounded-xl bg-sunken border border-dashed border-subtle hover:border-[#EE673A] text-center text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4 text-[#EE673A]" />
                  <span>Choose Photo File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setGroupEditAvatar(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <Input
                placeholder="Or paste avatar image URL (https://...)"
                value={groupEditAvatar}
                onChange={(e) => setGroupEditAvatar(e.target.value)}
              />
            </div>
          </div>

          <Input
            label="Group Name"
            placeholder="Group name"
            value={groupEditName}
            onChange={(e) => setGroupEditName(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-tertiary uppercase">Group Description</label>
            <textarea
              placeholder="Add group description or tagline..."
              value={groupEditDescription}
              onChange={(e) => setGroupEditDescription(e.target.value)}
              rows={3}
              className="w-full bg-sunken p-3 text-xs text-text-primary rounded-xl border border-subtle focus:outline-none focus:border-[#EE673A] transition-colors resize-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsEditGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={updatingGroupProfile}>
              Save Group Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* ----------------- MODAL: CHANGE AVATAR ----------------- */}
      <Modal open={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} title="Change Profile Avatar">
        <div className="space-y-5">
          {/* Current / Selected Preview */}
          <div className="text-center space-y-2">
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#EE673A] bg-sunken flex items-center justify-center shadow-lg">
              <Avatar initials={user?.username.slice(0, 2)} src={avatarInputUrl || user?.avatar} size="xl" />
            </div>
            <p className="text-xs text-text-tertiary">Select a preset or upload/paste a custom photo</p>
          </div>

          {/* Preset Grid */}
          <div>
            <label className="text-xs font-semibold text-text-tertiary uppercase block mb-2">Preset Avatars</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}1`,
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}2`,
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}1`,
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}2`,
                `https://api.dicebear.com/7.x/lorelei/svg?seed=${user?.username || 'user'}`,
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.username || 'user'}`,
                `https://api.dicebear.com/7.x/micah/svg?seed=${user?.username || 'user'}`,
                `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username || 'user'}`,
              ].map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarInputUrl(url)}
                  className={`p-1.5 rounded-2xl border transition-all ${avatarInputUrl === url ? 'border-[#EE673A] bg-[#EE673A]/10 scale-105' : 'border-subtle hover:bg-sunken'
                    }`}
                >
                  <img src={url} alt={`Preset ${i}`} className="w-12 h-12 rounded-full mx-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Upload or URL */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-text-tertiary uppercase block">Upload Photo or Enter Image URL</label>

            <label className="cursor-pointer p-3 rounded-2xl bg-sunken border border-dashed border-subtle hover:border-[#EE673A] text-center text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-2">
              <Camera className="w-4 h-4 text-[#EE673A]" />
              <span>Choose Photo from Device</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        setAvatarInputUrl(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            <Input
              placeholder="Or paste avatar URL (https://...)"
              value={avatarInputUrl}
              onChange={(e) => setAvatarInputUrl(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAvatarModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleSaveAvatar()} disabled={updatingAvatar}>
              {updatingAvatar ? 'Saving...' : 'Save Avatar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ----------------- WEBRTC CALL OVERLAY ----------------- */}
      {(outgoingCall || activeCall) && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white space-y-8 animate-in fade-in duration-300">
          <div className="text-center space-y-4">
            <Avatar
              initials={(outgoingCall?.targetUser?.username || activeCall?.fromUser?.username || 'E').slice(0, 2)}
              size="xl"
              className="mx-auto h-24 w-24 ring-4 ring-[#EE673A] animate-pulse"
            />
            <h3 className="font-display font-bold text-2xl">
              {outgoingCall ? `Calling ${outgoingCall.targetUser?.username}...` : `Incoming Call from ${activeCall?.fromUser?.username}`}
            </h3>
            <p className="text-xs text-text-tertiary uppercase tracking-widest">
              {outgoingCall?.callType || activeCall?.callType} Call Encrypted
            </p>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setOutgoingCall(null);
                setIncomingCall(null);
              }}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-600/50 transition-transform active:scale-95"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
            {activeCall && (
              <button
                onClick={() => {
                  showToast({ title: 'Call connected', variant: 'success' });
                }}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/50 transition-transform active:scale-95"
              >
                <Phone className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
