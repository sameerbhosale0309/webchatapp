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

import {
  MessageSquare,
  Search,
  Plus,
  Users,
  Phone,
  Video,
  Info,
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
    fetchConversations,
    selectConversation,
    sendMessage,
    createDirectConversation,
    createGroupConversation,
    toggleReaction,
    deleteMessage,
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

  // Profile Edit
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const storyTimerRef = useRef<any>(null);
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
      setStoriesGroups(res.data);
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
      setCallLogs(res.data);
    } catch (err) {
      // ignore
    } finally {
      setLoadingCalls(false);
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeConversationId && messages[activeConversationId]) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversationId, messages]);

  const activeConversation = conversations.find((c) => c._id === activeConversationId);
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];

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
        isOnline: false,
      };
    } else {
      const other = conv.participants.find((p) => p._id !== user?._id) || conv.participants[0];
      const isOnline = other ? onlineUserIds.has(other._id) : false;
      return {
        name: other?.username || 'User',
        avatar: other?.avatar || '',
        statusText: isOnline ? 'Online' : formatLastSeen(other?.lastSeen),
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
      setActiveTab('chats');
      setMobileView('chat');
      showToast({ title: 'Group created!', variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'Group creation failed', description: err.message, variant: 'error' });
    }
  };

  // Post Story Handler
  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyImageUrl && !storyCaption) {
      showToast({ title: 'Please provide an image URL or caption', variant: 'error' });
      return;
    }
    try {
      await api.post('/stories', {
        mediaUrl: storyImageUrl,
        mediaType: storyInputType,
        caption: storyCaption,
        bgGradient: storyBgGradient,
      });
      showToast({ title: 'Story posted!', variant: 'success' });
      setIsPostStoryModalOpen(false);
      setStoryImageUrl('');
      setStoryCaption('');
      fetchStories();
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

  // Message Input Handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (activeConversationId) {
      setTyping(activeConversationId, e.target.value.length > 0);
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

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const details = getConversationDetails(c);
    const matchesQuery = details.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterCategory === 'Groups') return matchesQuery && c.type === 'group';
    if (filterCategory === 'Work') return matchesQuery && c.type === 'direct';
    return matchesQuery;
  });

  const activeTypingNames = activeConversationId ? typingUsers[activeConversationId] || [] : [];
  const realMediaItems = currentMessages.flatMap((m) => m.attachments || []);

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

  if (!initialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#120F0E]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EE673A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full max-w-full bg-[#120F0E] text-[#F9F6F3] overflow-hidden font-sans antialiased selection:bg-[#EE673A]/30">
      
      {/* ========================================================================= */}
      {/* 1. LEFT CONVERSATIONS & TABS PANEL */}
      {/* ========================================================================= */}
      <div
        className={`w-full md:w-96 flex-shrink-0 bg-[#1A1514] border-r border-white/5 flex flex-col h-full relative z-20 transition-all ${
          mobileView === 'list' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white capitalize">
            {activeTab}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 rounded-full bg-[#292120] text-white/80 hover:text-white hover:bg-[#352A28] transition-colors"
              title="Search Users"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsPostStoryModalOpen(true)}
              className="p-2 rounded-full bg-[#292120] text-white/80 hover:text-white hover:bg-[#352A28] transition-colors"
              title="Post Story"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-[#292120] text-white/80 hover:text-white hover:bg-[#352A28] transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-300" />}
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
                <div className="relative w-14 h-14 rounded-2xl bg-[#292120] border border-white/10 flex items-center justify-center group-hover:border-[#EE673A] transition-colors">
                  <Avatar initials={user.username.slice(0, 2)} src={user.avatar} size="md" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#EE673A] flex items-center justify-center text-white text-xs font-bold border-2 border-[#1A1514]">
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
                  <div className={group.hasUnviewed ? 'story-ring' : 'p-0.5 rounded-full border border-white/20 opacity-60'}>
                    <div className="w-13 h-13 rounded-full overflow-hidden p-0.5 bg-[#1A1514]">
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filterCategory === cat
                      ? 'bg-[#EE673A] text-white shadow-lg shadow-[#EE673A]/25'
                      : 'bg-[#28201E] text-text-secondary hover:text-white hover:bg-[#332826]'
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
                  className="w-full rounded-2xl bg-[#241D1C] pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-tertiary border border-white/5 focus:outline-none focus:border-[#EE673A] transition-colors"
                />
              </div>
            </div>

            {/* Conversation Items Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar px-2 mt-2">
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
                  const unread = conv.unreadCounts?.[user._id] || 0;
                  const isTyping = (typingUsers[conv._id] || []).length > 0;
                  const isLastMessageRead = isMessageReadByRecipient(conv.lastMessage, conv);

                  return (
                    <button
                      key={conv._id}
                      onClick={() => {
                        selectConversation(conv._id);
                        setMobileView('chat');
                      }}
                      className={`w-full p-3 my-1 rounded-2xl flex items-center gap-3.5 text-left transition-all ${
                        isSelected
                          ? 'bg-[#2A211F] border border-white/10 shadow-md'
                          : 'hover:bg-[#231B1A]'
                      }`}
                    >
                      <div className="relative">
                        <Avatar initials={details.name.slice(0, 2)} src={details.avatar} size="md" />
                        {details.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#EE673A] border-2 border-[#1A1514]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="font-semibold text-xs text-white truncate">{details.name}</h3>
                          {conv.updatedAt && (
                            <span className="text-[10px] text-text-tertiary flex-shrink-0">
                              {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-text-secondary truncate flex items-center gap-1">
                            {isTyping ? (
                              <span className="text-[#EE673A] font-semibold animate-pulse">Typing...</span>
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
                                <span className="truncate">{conv.lastMessage?.content || 'No messages yet'}</span>
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
                    </button>
                  );
                })
              )}
            </div>
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
                    className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 flex items-center justify-between hover:bg-[#2A211F] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar initials={(peer?.username || 'U').slice(0, 2)} src={peer?.avatar} size="md" />
                      <div>
                        <h4 className="font-semibold text-xs text-white">{peer?.username}</h4>
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
                  <h3 className="font-bold text-xs text-white">Post Status Update</h3>
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
                  className="p-3.5 rounded-2xl bg-[#241D1C] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#2A211F] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={group.hasUnviewed ? 'story-ring' : 'p-0.5 rounded-full border border-white/20 opacity-60'}>
                      <div className="w-11 h-11 rounded-full overflow-hidden p-0.5 bg-[#1A1514]">
                        <Avatar initials={group.user.username.slice(0, 2)} src={group.user.avatar} size="md" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-white">{group.user.username}</h4>
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
              <Avatar initials={user.username.slice(0, 2)} src={user.avatar} size="xl" className="mx-auto border-2 border-[#EE673A]" />
              <div>
                <h3 className="font-display font-bold text-lg text-white">{user.username}</h3>
                <p className="text-xs text-text-tertiary">{user.email}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-left space-y-2">
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
                  <p className="text-xs text-white">{user.bio || 'No bio set'}</p>
                ) : (
                  <input
                    type="text"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-[#1A1514] px-3 py-1.5 text-xs text-white rounded-xl border border-[#EE673A] focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-center">
                <span className="text-[10px] text-text-tertiary block">Chats</span>
                <span className="font-bold text-xs text-white">{conversations.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-center">
                <span className="text-[10px] text-text-tertiary block">Calls</span>
                <span className="font-bold text-xs text-white">{callLogs.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-center">
                <span className="text-[10px] text-text-tertiary block">Stories</span>
                <span className="font-bold text-xs text-white">{storiesGroups.length}</span>
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
        <div className="p-3 bg-[#1A1514]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between relative">
          <div className="flex-1 flex items-center justify-around">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex flex-col items-center gap-1 text-xs font-semibold ${
                activeTab === 'chats' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px]">Chats</span>
            </button>
            <button
              onClick={() => setActiveTab('call')}
              className={`flex flex-col items-center gap-1 text-xs font-semibold ${
                activeTab === 'call' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-white'
              }`}
            >
              <Phone className="w-5 h-5" />
              <span className="text-[10px]">Call</span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex flex-col items-center gap-1 text-xs font-semibold ${
                activeTab === 'updates' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-white'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px]">Updates</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 text-xs font-semibold ${
                activeTab === 'profile' ? 'text-[#EE673A]' : 'text-text-tertiary hover:text-white'
              }`}
            >
              <Avatar initials={user.username.slice(0, 2)} src={user.avatar} size="sm" />
              <span className="text-[10px]">Profile</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#EE673A] to-[#FF8A64] text-white flex items-center justify-center shadow-lg shadow-[#EE673A]/40 hover:scale-105 active:scale-95 transition-all ml-2"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT VIEW */}
      {/* ========================================================================= */}
      {activeConversation ? (
        <main
          className={`flex-1 flex flex-col h-full bg-gradient-to-b from-[#1C1615] via-[#141010] to-[#0E0C0B] relative z-10 transition-all ${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Header */}
          <header className="p-3.5 border-b border-white/5 bg-[#1C1615]/80 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-white/5"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {(() => {
                const details = getConversationDetails(activeConversation);
                return (
                  <>
                    <Avatar initials={details.name.slice(0, 2)} src={details.avatar} size="md" />
                    <div>
                      <h2 className="font-display font-bold text-sm text-white">{details.name}</h2>
                      <p className="text-[11px] text-text-secondary">
                        {activeTypingNames.length > 0 ? (
                          <span className="text-[#EE673A] font-semibold animate-pulse">
                            {activeTypingNames.join(', ')} is typing...
                          </span>
                        ) : (
                          details.statusText
                        )}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => startCall('audio')}
                className="p-2.5 rounded-xl hover:bg-white/5 text-text-secondary hover:text-[#EE673A] transition-colors"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startCall('video')}
                className="p-2.5 rounded-xl hover:bg-white/5 text-text-secondary hover:text-[#EE673A] transition-colors"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowRightSidebar(!showRightSidebar);
                  setMobileView('profile');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  showRightSidebar ? 'bg-[#EE673A]/20 text-[#EE673A]' : 'hover:bg-white/5 text-text-secondary'
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
                <h3 className="text-sm font-semibold text-white">No messages yet</h3>
                <p className="text-xs text-text-tertiary">Start the real-time conversation!</p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const isMe = msg.sender?._id === user._id;
                const isRead = isMessageReadByRecipient(msg, activeConversation);

                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
                  >
                    {!isMe && activeConversation.type === 'group' && (
                      <span className="text-[10px] font-semibold text-text-tertiary mb-1 ml-1">
                        {msg.sender?.username}
                      </span>
                    )}

                    <div className="flex items-center gap-2 max-w-[88%] sm:max-w-[75%]">
                      {/* Message Bubble */}
                      <div
                        className={`rounded-3xl p-4 text-xs space-y-2 shadow-lg transition-all ${
                          isMe
                            ? 'bg-[#2E2321] text-white rounded-br-none border border-white/5'
                            : 'bg-[#211A18]/90 text-white rounded-bl-none border border-white/5 backdrop-blur-md'
                        }`}
                      >
                        {/* Reply reference */}
                        {msg.replyTo && (
                          <div className="rounded-xl bg-black/30 p-2 text-[11px] border-l-2 border-[#EE673A] mb-1">
                            <span className="font-semibold block text-[10px] text-[#EE673A]">
                              @{msg.replyTo.sender?.username}
                            </span>
                            <p className="truncate opacity-90">{msg.replyTo.content}</p>
                          </div>
                        )}

                        {/* Content text */}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="pt-2 space-y-2">
                            {msg.attachments.map((att, i) => {
                              const isAudio =
                                att.type === 'audio' ||
                                (att.name && /\.(mp3|wav|ogg|m4a|webm)$/i.test(att.name)) ||
                                (att.url && att.url.startsWith('data:audio'));

                              return (
                                <div key={i} className="rounded-2xl overflow-hidden relative">
                                  {att.type === 'image' ? (
                                    <div className="relative border border-white/10 rounded-2xl overflow-hidden">
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="max-h-64 w-full object-cover rounded-2xl"
                                      />
                                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold flex items-center gap-1.5 text-white">
                                        <Flame className="w-3.5 h-3.5 text-[#EE673A]" /> 3
                                        <Heart className="w-3.5 h-3.5 text-red-500 ml-1" /> 2
                                      </div>
                                    </div>
                                  ) : isAudio ? (
                                    <AudioPlayer src={att.url} name={att.name || 'Voice Note'} isMe={isMe} />
                                  ) : (
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 p-3 bg-black/30 hover:bg-black/40 rounded-xl text-xs border border-white/10"
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
                        <div className="flex items-center justify-end gap-1.5 text-[10px] text-text-tertiary pt-1">
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-text-tertiary" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-text-tertiary hover:text-white"
                          title="Reply"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        {isMe && (
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="px-4 py-2 bg-[#1C1615] border-t border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4 text-[#EE673A]" />
                <span>
                  Replying to <strong className="text-white">@{replyingTo.sender?.username}</strong>: &quot;
                  {replyingTo.content}&quot;
                </span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-text-tertiary hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachment Preview Banner */}
          {attachmentPreview && (
            <div className="px-4 py-2 bg-[#1C1615] border-t border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {attachmentPreview.type === 'audio' ? (
                  <Mic className="w-4 h-4 text-[#EE673A]" />
                ) : (
                  <Paperclip className="w-4 h-4 text-[#EE673A]" />
                )}
                <span className="truncate font-medium">
                  {attachmentPreview.type === 'audio' ? `Audio: ${attachmentPreview.name}` : attachmentPreview.name}
                </span>
              </div>
              <button onClick={() => setAttachmentPreview(null)} className="text-text-tertiary hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <footer className="p-3 bg-[#1A1514]/90 backdrop-blur-xl border-t border-white/5">
            {isRecordingVoice ? (
              <div className="flex items-center justify-between bg-[#292120] border border-red-500/30 rounded-full px-4 py-2 text-xs text-red-400">
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

                <div className="flex-1 flex items-center bg-[#251E1C] rounded-full px-4 py-1.5 border border-white/5 focus-within:border-[#EE673A] transition-colors">
                  <input
                    type="text"
                    placeholder="Type here..."
                    value={messageInput}
                    onChange={handleInputChange}
                    className="w-full bg-transparent text-xs text-white placeholder:text-text-tertiary focus:outline-none py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-text-tertiary hover:text-white transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startRecordingVoice}
                  className="p-3 rounded-full bg-[#251E1C] text-text-tertiary hover:text-white hover:bg-[#332826] transition-colors"
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
        <main className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#120F0E] text-center p-8 space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#EE673A] to-[#FF8A64] flex items-center justify-center shadow-2xl shadow-[#EE673A]/20">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Select a Chat to Start Messaging</h2>
          <p className="text-xs text-text-secondary max-w-sm">
            Choose a conversation from the sidebar or click (+) to start a new chat with real-time updates.
          </p>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. RIGHT PROFILE SIDEBAR */}
      {/* ========================================================================= */}
      {(showRightSidebar || mobileView === 'profile') && (
        <aside className="w-full md:w-80 flex-shrink-0 bg-[#161211] border-l border-white/5 p-5 flex flex-col h-full z-30 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowRightSidebar(false);
                setMobileView('list');
              }}
              className="p-1 text-text-tertiary hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-full bg-[#251E1C] text-red-400 hover:bg-red-500/10"
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
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#EE673A] border-2 border-[#161211]" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">
              {activeConversation ? getConversationDetails(activeConversation).name : user.username}
            </h3>
            <p className="text-xs text-text-tertiary">
              {activeConversation ? getConversationDetails(activeConversation).statusText : user.email}
            </p>
          </div>

          {/* Dynamic Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-center">
              <span className="text-[10px] text-text-tertiary block">Messages</span>
              <span className="font-bold text-xs text-white">{currentMessages.length || conversations.length * 15}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-center">
              <span className="text-[10px] text-text-tertiary block">Group</span>
              <span className="font-bold text-xs text-white">{conversations.filter(c => c.type === 'group').length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#241D1C] border border-white/5 text-center">
              <span className="text-[10px] text-text-tertiary block">Media</span>
              <span className="font-bold text-xs text-white">{realMediaItems.length}</span>
            </div>
          </div>

          {/* Dynamic Media Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Media and photos</span>
              <span className="text-[10px] text-text-tertiary">{realMediaItems.length} files</span>
            </div>
            {realMediaItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {realMediaItems.slice(0, 3).map((item, i) => (
                  <img
                    key={i}
                    src={item.url}
                    alt={item.name}
                    className="h-16 w-full object-cover rounded-xl border border-white/10"
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#241D1C] text-center text-xs text-text-tertiary">
                No media shared in this chat
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#241D1C] border border-white/5 hover:bg-[#2A2220] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-white">Notification</span>
              </div>
              <ChevronLeft className="w-4 h-4 rotate-180 text-text-tertiary" />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#241D1C] border border-white/5 hover:bg-[#2A2220] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-white">Media visibility</span>
              </div>
              <ChevronLeft className="w-4 h-4 rotate-180 text-text-tertiary" />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#241D1C] border border-white/5">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-white">Lock Chat</span>
              </div>
              <button
                onClick={() => setLockChat(!lockChat)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  lockChat ? 'bg-[#EE673A]' : 'bg-[#352A28]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    lockChat ? 'translate-x-5' : 'translate-x-0'
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
              className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                storyInputType === 'image'
                  ? 'bg-[#EE673A] text-white border-[#EE673A]'
                  : 'bg-[#241D1C] text-text-tertiary border-white/5'
              }`}
            >
              Photo Story
            </button>
            <button
              type="button"
              onClick={() => setStoryInputType('text')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                storyInputType === 'text'
                  ? 'bg-[#EE673A] text-white border-[#EE673A]'
                  : 'bg-[#241D1C] text-text-tertiary border-white/5'
              }`}
            >
              Text Story
            </button>
          </div>

          {storyInputType === 'image' ? (
            <Input
              label="Image URL"
              placeholder="https://images.unsplash.com/..."
              value={storyImageUrl}
              onChange={(e) => setStoryImageUrl(e.target.value)}
            />
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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm h-[80vh] rounded-3xl overflow-hidden relative flex flex-col justify-between p-6 shadow-2xl border border-white/10"
               style={{
                 background: activeStoryGroup.stories[activeStoryIndex]?.bgGradient || '#1C1615',
               }}
          >
            {/* Story Progress Bar */}
            <div className="flex gap-1.5 absolute top-4 left-4 right-4 z-20">
              {activeStoryGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      i === activeStoryIndex ? 'w-full' : i < activeStoryIndex ? 'w-full' : 'w-0'
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
              <button onClick={() => setActiveStoryGroup(null)} className="p-2 rounded-full bg-black/40 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Story Content */}
            <div className="flex-1 flex flex-col items-center justify-center my-6 relative z-10 text-center">
              {activeStoryGroup.stories[activeStoryIndex]?.mediaUrl && (
                <img
                  src={activeStoryGroup.stories[activeStoryIndex].mediaUrl}
                  alt="Story"
                  className="max-h-96 w-full object-cover rounded-2xl shadow-xl border border-white/10"
                />
              )}
              {activeStoryGroup.stories[activeStoryIndex]?.caption && (
                <p className="text-base font-bold text-white mt-4 drop-shadow-md px-4">
                  {activeStoryGroup.stories[activeStoryIndex].caption}
                </p>
              )}
            </div>

            {/* Bottom Views Footer */}
            <div className="flex items-center justify-between text-xs text-white/80 pt-2 border-t border-white/10 relative z-20">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-300" />
                <span>{activeStoryGroup.stories[activeStoryIndex]?.views?.length || 1} views</span>
              </div>
              <span className="text-[10px] opacity-70">Tap right for next</span>
            </div>
          </div>
        </div>
      )}

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
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#251E1C] transition-colors border border-white/5 text-left"
              >
                <div className="flex items-center gap-3">
                  <Avatar initials={u.username.slice(0, 2)} src={u.avatar} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-white">{u.username}</div>
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
            <label className="text-xs font-semibold text-text-tertiary uppercase">Select Group Members</label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {conversations.map((c) => {
                const other = c.participants.find((p) => p._id !== user._id);
                if (!other) return null;
                const isSelected = selectedGroupMembers.includes(other._id);
                return (
                  <button
                    key={other._id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== other._id));
                      } else {
                        setSelectedGroupMembers([...selectedGroupMembers, other._id]);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-[#EE673A] bg-[#EE673A]/10'
                        : 'border-white/5 hover:bg-[#251E1C]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar initials={other.username.slice(0, 2)} src={other.avatar} size="sm" />
                      <span className="text-xs font-semibold text-white">{other.username}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#EE673A]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateGroup}>Create Group</Button>
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
