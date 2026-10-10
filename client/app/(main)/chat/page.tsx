'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useChatStore, Message, Conversation } from '@/stores/chatStore';
import { useToastStore } from '@/stores/toastStore';
import { soundEffects } from '@/lib/soundEffects';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { TypingIndicator } from '@/components/ui/TypingIndicator';

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
  LogOut,
  X,
  FileText,
  ChevronLeft,
  Pin,
  Play,
  Edit2,
  Radio,
  Disc,
  Terminal,
  Cpu,
  Tv,
  Layers,
  UserCheck,
  Calendar,
  Sparkles,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Trash2,
  Camera,
  Eye,
  ChevronRight,
  ShieldCheck,
  Palette,
  Check,
  Mic,
} from 'lucide-react';
import { api } from '@/lib/api';

const CHAT_THEMES = [
  { id: 'Default', label: 'Default', bgClass: 'bg-paper-display', swatchBg: 'bg-[#beb4ad] border-[#2c2725]' },
  { id: 'Sunset', label: 'Sunset', bgClass: 'bg-gradient-to-b from-[#2c2725] via-[#4a2e2b] to-[#733e38]', swatchBg: 'bg-gradient-to-tr from-[#ff7e5f] to-[#feb47b]' },
  { id: 'Emerald', label: 'Emerald', bgClass: 'bg-gradient-to-b from-[#1a2e2b] via-[#24423d] to-[#122421]', swatchBg: 'bg-[#2de0a0]' },
  { id: 'Cyberpunk', label: 'Cyberpunk', bgClass: 'bg-gradient-to-b from-[#1c122c] via-[#2d1b46] to-[#150a21]', swatchBg: 'bg-gradient-to-tr from-[#8a2be2] to-[#00ffff]' },
  { id: 'Ocean', label: 'Ocean', bgClass: 'bg-gradient-to-b from-[#0f2027] via-[#203a43] to-[#2c5364]', swatchBg: 'bg-[#00b4d8]' },
  { id: 'Midnight', label: 'Midnight', bgClass: 'bg-[#1a1716]', swatchBg: 'bg-[#1a1716] border-[#4a423f]' },
  { id: 'Velvet', label: 'Velvet', bgClass: 'bg-gradient-to-b from-[#2a1b24] via-[#422235] to-[#1a0e16]', swatchBg: 'bg-[#e84393]' },
  { id: 'Warm', label: 'Warm', bgClass: 'bg-gradient-to-b from-[#3a2818] via-[#543b22] to-[#24170d]', swatchBg: 'bg-[#f59e0b]' },
];

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

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '😮', '⚡', '📼', '📻'];

export default function ChatPage() {
  const router = useRouter();
  const { user, initialized, initAuth, logout, updateUser } = useAuthStore();
  const { show: showToast } = useToastStore();

  const {
    connectSocket,
    onlineUserIds,
    typingUsers,
    setTyping,
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
    updateGroupProfile,
    leaveGroup,
    removeGroupMember,
    makeGroupAdmin,
  } = useChatStore();

  // Navigation & 4 Master Tabs: chats | updates | call | profile
  const [activeTab, setActiveTab] = useState<'chats' | 'call' | 'updates' | 'profile'>('chats');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Favorites' | 'Work' | 'Groups'>('All');
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'profile'>('list');

  // Messaging & Input
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('Default');
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; type: 'image' | 'file' | 'audio' | 'video'; name: string; isUploading?: boolean } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showEmojiPickerForMsgId, setShowEmojiPickerForMsgId] = useState<string | null>(null);
  const [stampedMsgId, setStampedMsgId] = useState<string | null>(null);

  // Dynamic Stories & Calls Data
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

  // Search & Group Form
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Story Form
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [storyCaption, setStoryCaption] = useState('');
  const [uploadingStoryImage, setUploadingStoryImage] = useState(false);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  // Profile & Group Profile Edit
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [editingGroupBio, setEditingGroupBio] = useState(false);
  const [groupBioInput, setGroupBioInput] = useState('');
  const groupAvatarFileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording State & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const storyTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const startRecording = async () => {
    soundEffects.playClick();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      showToast({ title: 'VOICE RECORDING STARTED', description: 'Speak into your microphone...', variant: 'info' });
    } catch (err: any) {
      console.error('Microphone access error:', err);
      showToast({ title: 'MICROPHONE ERROR', description: 'Could not access audio recording device.', variant: 'error' });
    }
  };

  const stopRecording = () => {
    soundEffects.playClick();
    if (mediaRecorderRef.current && isRecording) {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(audioBlob);
        const fileName = `voice_note_${Date.now()}.webm`;
        const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });

        try {
          const formData = new FormData();
          formData.append('files', audioFile);
          const res = await api.upload('/upload', formData);
          const uploaded = Array.isArray(res.data) ? res.data[0] : res.data;
          const url = uploaded?.url || localUrl;
          setAttachmentPreview({
            url,
            type: 'audio',
            name: fileName,
          });
          showToast({ title: 'VOICE NOTE RECORDED', variant: 'success' });
        } catch (err) {
          setAttachmentPreview({
            url: localUrl,
            type: 'audio',
            name: fileName,
          });
          showToast({ title: 'VOICE NOTE READY FOR TRANSMISSION', variant: 'info' });
        }
      };

      recorder.stop();
      if (recorder.stream) {
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Initial Auth & Socket
  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (initialized) {
      if (!user) {
        router.push('/login');
      } else {
        connectSocket();
        fetchConversations();

        // Defer secondary background fetches (Stories & Calls) until main thread is idle
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            fetchStories();
            fetchCalls();
          });
        } else {
          setTimeout(() => {
            fetchStories();
            fetchCalls();
          }, 100);
        }
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
      if (groups.length > 0 && !activeStoryGroup) {
        setActiveStoryGroup(groups[0]);
        setActiveStoryIndex(0);
      }
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

  // Scroll to bottom on message update
  useEffect(() => {
    if (activeConversationId && (messages[activeConversationId] || activeTypingNames.length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversationId, messages, activeTypingNames.length]);

  // Story Auto Advance Timer for Center Pane
  useEffect(() => {
    if (activeTab === 'updates' && activeStoryGroup && activeStoryGroup.stories.length > 0) {
      storyTimerRef.current = setTimeout(() => {
        if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
          const nextIndex = activeStoryIndex + 1;
          setActiveStoryIndex(nextIndex);
          if (activeStoryGroup.stories[nextIndex]) {
            api.post(`/stories/${activeStoryGroup.stories[nextIndex]._id}/view`).catch(() => { });
          }
        } else {
          // Advance to next story group
          const currentGroupIdx = storiesGroups.findIndex((g) => g.user._id === activeStoryGroup.user._id);
          if (currentGroupIdx >= 0 && currentGroupIdx < storiesGroups.length - 1) {
            const nextGroup = storiesGroups[currentGroupIdx + 1];
            setActiveStoryGroup(nextGroup);
            setActiveStoryIndex(0);
            if (nextGroup.stories[0]) {
              api.post(`/stories/${nextGroup.stories[0]._id}/view`).catch(() => { });
            }
          }
        }
      }, 6000);
    }
    return () => clearTimeout(storyTimerRef.current);
  }, [activeTab, activeStoryGroup, activeStoryIndex, storiesGroups]);

  // Format timestamp helper
  const formatTimeStr = (dateStr: string) => {
    if (!dateStr) return '00:00:00.00';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '00:00:00.00';
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    const secs = date.getSeconds().toString().padStart(2, '0');
    const ms = Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}.${ms}`;
  };

  // Conversation Details
  const getConversationDetails = (conv: Conversation) => {
    const validParticipants = (conv.participants || []).filter(Boolean);
    if (conv.type === 'group') {
      return {
        name: conv.name || 'GROUP FREQUENCY',
        originalName: conv.name || 'GROUP FREQUENCY',
        avatar: conv.avatar || '',
        statusText: `${validParticipants.length} OPERATORS CONNECTED`,
        description: conv.description || '',
        isOnline: false,
      };
    } else {
      const other = validParticipants.find((p) => p && p._id !== user?._id) || validParticipants[0];
      const isOnline = other ? onlineUserIds.has(other._id) : false;
      const myCustomName = user?._id && conv.customNames ? conv.customNames[user._id] : undefined;

      return {
        name: myCustomName || other?.username || 'OPERATOR',
        originalName: other?.username || 'OPERATOR',
        avatar: other?.avatar || '',
        statusText: isOnline ? 'RECEIVER ONLINE' : 'RECEIVER OFFLINE',
        description: other?.bio || '',
        isOnline,
        otherUser: other,
      };
    }
  };

  // Search Users
  const handleSearchUsers = async (val: string) => {
    setUserSearchInput(val);
    try {
      const endpoint = val.trim() ? `/users?q=${encodeURIComponent(val.trim())}` : '/users';
      const res = await api.get(endpoint);
      const users = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setUserSearchResults(users);
    } catch (err) {
      setUserSearchResults([]);
    }
  };

  const handleStartDirectChat = async (recipientId: string) => {
    soundEffects.playClick();
    try {
      await createDirectConversation(recipientId);
      setIsNewChatModalOpen(false);
      setUserSearchInput('');
      setUserSearchResults([]);
      setActiveTab('chats');
      setMobileView('chat');
      showToast({ title: 'DIRECT FEED OPENED', variant: 'info' });
    } catch (err: any) {
      showToast({ title: 'FAILED TO OPEN FEED', description: err.message, variant: 'error' });
    }
  };

  const handleCreateGroup = async () => {
    soundEffects.playClick();
    if (!groupName.trim()) {
      showToast({ title: 'PLEASE ENTER GROUP FREQUENCY NAME', variant: 'error' });
      return;
    }
    if (selectedGroupMembers.length === 0) {
      showToast({ title: 'SELECT AT LEAST 1 OPERATOR', variant: 'error' });
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
      showToast({ title: `GROUP FREQUENCY "${groupName}" ESTABLISHED!`, variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'GROUP ESTABLISHMENT FAILED', description: err.message, variant: 'error' });
    }
  };

  // Group Management Handlers
  const handleGroupAvatarFileUpload = async (file: File) => {
    if (!file || !activeConversation || activeConversation.type !== 'group') return;
    soundEffects.playClick();
    try {
      showToast({ title: 'UPLOADING GROUP AVATAR...', variant: 'info' });
      const formData = new FormData();
      formData.append('files', file);

      const res = await api.upload('/upload', formData);
      const uploadedData = Array.isArray(res.data) ? res.data[0] : res.data;
      const avatarUrl = uploadedData?.url;

      if (!avatarUrl) throw new Error('Upload returned no URL');

      await updateGroupProfile(activeConversation._id, { avatar: avatarUrl });
      showToast({ title: 'GROUP AVATAR UPDATED SUCCESSFULLY!', variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'FAILED TO UPDATE GROUP AVATAR', description: err.message, variant: 'error' });
    }
  };

  const handleSaveGroupName = async () => {
    if (!activeConversation || activeConversation.type !== 'group' || !groupNameInput.trim()) return;
    soundEffects.playClick();
    try {
      await updateGroupProfile(activeConversation._id, { name: groupNameInput.trim() });
      setEditingGroupName(false);
      showToast({ title: 'GROUP NAME UPDATED!', variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'FAILED TO UPDATE GROUP NAME', description: err.message, variant: 'error' });
    }
  };

  const handleSaveGroupBio = async () => {
    if (!activeConversation || activeConversation.type !== 'group') return;
    soundEffects.playClick();
    try {
      await updateGroupProfile(activeConversation._id, { description: groupBioInput.trim() });
      setEditingGroupBio(false);
      showToast({ title: 'GROUP BIO UPDATED!', variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'FAILED TO UPDATE GROUP BIO', description: err.message, variant: 'error' });
    }
  };

  const handleLeaveGroupAction = async () => {
    if (!activeConversation || activeConversation.type !== 'group') return;
    soundEffects.playClick();
    if (confirm('Are you sure you want to leave this group chat?')) {
      try {
        await leaveGroup(activeConversation._id);
        setShowRightSidebar(false);
        setMobileView('list');
        showToast({ title: 'YOU LEFT THE GROUP', variant: 'info' });
      } catch (err: any) {
        showToast({ title: 'FAILED TO LEAVE GROUP', description: err.message, variant: 'error' });
      }
    }
  };

  // Post Story Handler
  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playClick();
    if (!storyImageUrl && !storyCaption) {
      showToast({ title: 'PLEASE SPECIFY PHOTO URL OR CAPTION', variant: 'error' });
      return;
    }
    try {
      const res = await api.post('/stories', {
        mediaUrl: storyImageUrl,
        mediaType: storyImageUrl ? 'image' : 'text',
        caption: storyCaption,
      });
      showToast({ title: 'story posted successfully!', variant: 'success' });
      setIsPostStoryModalOpen(false);
      setStoryImageUrl('');
      setStoryCaption('');
      await fetchStories();
    } catch (err: any) {
      showToast({ title: 'POSTING STORY FAILED', description: err.message, variant: 'error' });
    }
  };

  // Story Photo Upload Handler
  const handleStoryFileUpload = async (file: File) => {
    if (!file) return;
    soundEffects.playClick();
    setUploadingStoryImage(true);
    try {
      showToast({ title: 'UPLOADING STORY PHOTO...', variant: 'info' });
      const formData = new FormData();
      formData.append('files', file);

      const res = await api.upload('/upload', formData);
      const uploadedData = Array.isArray(res.data) ? res.data[0] : res.data;
      const uploadedUrl = uploadedData?.url;

      if (!uploadedUrl) {
        throw new Error('Upload returned no URL');
      }

      setStoryImageUrl(uploadedUrl);
      showToast({ title: 'STORY PHOTO ATTACHED!', variant: 'success' });
    } catch (err: any) {
      console.error('Story photo upload error:', err);
      showToast({ title: 'FAILED TO UPLOAD PHOTO', description: err.message || 'Upload failed', variant: 'error' });
    } finally {
      setUploadingStoryImage(false);
    }
  };

  // Open Story Viewer in Center Pane
  const openStoryViewer = (group: StoryGroup) => {
    soundEffects.playClick();
    setActiveStoryGroup(group);
    setActiveStoryIndex(0);
    setMobileView('chat');
    if (group.stories[0]) {
      api.post(`/stories/${group.stories[0]._id}/view`).catch(() => { });
    }
  };

  // Delete Story Handler
  const handleDeleteStory = async (storyId: string) => {
    soundEffects.playClick();
    try {
      await api.delete(`/stories/${storyId}`);
      showToast({ title: 'STORY DELETED SUCCESSFULLY!', variant: 'success' });

      let isGroupEmpty = false;
      if (activeStoryGroup) {
        const remaining = activeStoryGroup.stories.filter((s) => s._id !== storyId);
        if (remaining.length === 0) {
          isGroupEmpty = true;
          setActiveStoryGroup(null);
          setMobileView('list');
        } else {
          setActiveStoryGroup({ ...activeStoryGroup, stories: remaining });
          setActiveStoryIndex(0);
        }
      } else {
        setMobileView('list');
      }

      // Refresh stories list from server without forcing auto-select if group became empty
      const res = await api.get('/stories');
      const groups = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setStoriesGroups(groups);

      if (isGroupEmpty || groups.length === 0) {
        setMobileView('list');
      }
    } catch (err: any) {
      showToast({ title: 'FAILED TO DELETE STORY', description: err.message, variant: 'error' });
    }
  };

  // Save Bio Handler
  const handleSaveBio = async () => {
    soundEffects.playClick();
    try {
      await api.patch('/users/profile', { bio: bioInput });
      updateUser({ bio: bioInput });
      setEditingBio(false);
      showToast({ title: 'OPERATOR BIO UPDATED', variant: 'success' });
    } catch (err: any) {
      showToast({ title: 'FAILED TO UPDATE BIO', description: err.message, variant: 'error' });
    }
  };

  // Avatar File Upload Handler
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = async (file: File) => {
    if (!file) return;
    soundEffects.playClick();
    setIsUploadingAvatar(true);
    setAvatarUploadProgress(0);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 12) + 8;
      if (currentProgress > 92) {
        currentProgress = 92;
        clearInterval(progressInterval);
      }
      setAvatarUploadProgress(currentProgress);
    }, 120);

    try {
      showToast({ title: 'UPLOADING AVATAR PHOTO...', variant: 'info' });
      const formData = new FormData();
      formData.append('files', file);

      const res = await api.upload('/upload', formData);
      const uploadedData = Array.isArray(res.data) ? res.data[0] : res.data;
      const avatarUrl = uploadedData?.url;

      if (!avatarUrl) {
        throw new Error('Upload returned no URL');
      }

      clearInterval(progressInterval);
      setAvatarUploadProgress(100);

      await api.patch('/users/profile', { avatar: avatarUrl });
      updateUser({ avatar: avatarUrl });
      soundEffects.playReceive();

      setTimeout(() => {
        setIsUploadingAvatar(false);
        setAvatarUploadProgress(null);
        setIsAvatarModalOpen(false);
        showToast({ title: 'AVATAR UPDATED SUCCESSFULLY!', variant: 'success' });
      }, 700);
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsUploadingAvatar(false);
      setAvatarUploadProgress(null);
      console.error('Avatar upload error:', err);
      showToast({ title: 'FAILED TO UPLOAD AVATAR', description: err.message || 'Upload failed', variant: 'error' });
    }
  };

  // Message Input Handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    soundEffects.playTyping();
    if (activeConversationId) {
      const activeConv = conversations.find((c) => c._id === activeConversationId);
      const recipientIds = activeConv?.participants.map((p) => p._id) || [];

      if (e.target.value.length > 0) {
        setTyping(activeConversationId, true, recipientIds);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(activeConversationId, false, recipientIds);
        }, 3000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTyping(activeConversationId, false, recipientIds);
      }
    }
  };

  // Async file selection & server upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playClick();
    const tempUrl = URL.createObjectURL(file);
    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
          ? 'video'
          : 'file';

    setAttachmentPreview({
      url: tempUrl,
      type: fileType,
      name: file.name,
      isUploading: true,
    });
    setUploadingAttachment(true);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const res = await api.upload('/upload', formData);
      const uploadedData = Array.isArray(res.data) ? res.data[0] : res.data;
      const permanentUrl = uploadedData?.url || tempUrl;

      setAttachmentPreview({
        url: permanentUrl,
        type: fileType,
        name: file.name,
        isUploading: false,
      });
      showToast({ title: 'ATTACHMENT READY FOR TRANSMISSION', variant: 'success' });
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast({ title: 'UPLOAD FAILED', description: err.message || 'Failed to upload attachment', variant: 'error' });
      setAttachmentPreview(null);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachmentPreview) return;

    if (uploadingAttachment || attachmentPreview?.isUploading) {
      showToast({ title: 'PLEASE WAIT', description: 'Attachment is uploading to server...', variant: 'info' });
      return;
    }

    soundEffects.playSend();

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
      const activeConv = conversations.find((c) => c._id === activeConversationId);
      const recipientIds = activeConv?.participants.map((p) => p._id) || [];
      setTyping(activeConversationId, false, recipientIds);

      try {
        await sendMessage(contentToSend, attachmentsToSend, replyId);
      } catch (err: any) {
        showToast({ title: 'TRANSMISSION FAILED', description: err.message, variant: 'error' });
      }
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    soundEffects.playStamp();
    setStampedMsgId(messageId);
    setTimeout(() => setStampedMsgId(null), 600);
    setShowEmojiPickerForMsgId(null);
    try {
      await toggleReaction(messageId, emoji);
    } catch (err) {
      // ignore
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const validParticipants = (c.participants || []).filter(Boolean);
    if (c.type === 'direct') {
      if (validParticipants.length < 2) return false;
      if (user && !validParticipants.some((p) => p && p._id !== user._id)) return false;
    }

    const details = getConversationDetails(c);
    const matchesSearch = details.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterCategory === 'Favorites') return favoriteConversationIds.includes(c._id);
    if (filterCategory === 'Groups') return c.type === 'group';
    if (filterCategory === 'Work') return c.type === 'direct';
    return true;
  });

  const activeStory = activeStoryGroup?.stories[activeStoryIndex];

  return (
    <main className="flex h-screen w-screen bg-canvas overflow-hidden crt-overlay font-mono text-dark-oxide select-none">

      {/* Main Container */}
      <div className="flex w-full h-full">

        {/* ========================================================================= */}
        {/* LEFT PANE: DECK NAVIGATION & 4 TABS RACK (SIDEBAR)                         */}
        {/* ========================================================================= */}
        <aside className={`w-full md:w-80 lg:w-96 bg-chassis-sand border-r-2 border-dark-oxide flex flex-col shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}>

          {/* Deck Rack Top Header & Tuner HUD */}
          <div className="p-3 border-b-2 border-dark-oxide bg-cassette-housing/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar
                  initials={user?.username || 'OP'}
                  src={user?.avatar}
                  size="sm"
                  presence="online"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase tracking-wider text-dark-oxide">
                    [{user?.username?.toUpperCase() || 'OPERATOR'}]
                  </span>
                  <span className="text-[10px] text-black flex items-center gap-1">
                    <Radio className="w-3 h-3 text-black inline animate-pulse" />
                    STATUS: ACTIVE
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { soundEffects.playClick(); handleSearchUsers(''); setIsNewChatModalOpen(true); }}
                  className="p-1.5 rounded-sm bg-paper-display border border-dark-oxide/50 text-dark-oxide hover:bg-magnetic-oxide hover:text-paper-display bevel-raised transition-all"
                  title="New Direct Telemetry Feed"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { soundEffects.playClick(); handleSearchUsers(''); setIsGroupModalOpen(true); }}
                  className="p-1.5 rounded-sm bg-paper-display border border-dark-oxide/50 text-dark-oxide hover:bg-magnetic-oxide hover:text-paper-display bevel-raised transition-all"
                  title="Create Group Chat"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { soundEffects.playClick(); logout(); router.push('/login'); }}
                  className="p-1.5 rounded-sm bg-cassette-housing border border-dark-oxide/50 text-danger hover:bg-danger hover:text-paper-display bevel-raised transition-all"
                  title="Eject Spool / Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MASTER 4 TABS NAVIGATION RACK */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-dark-oxide rounded-sm border border-black bevel-recessed">
              {(
                [
                  { id: 'chats', label: 'CHATS', icon: MessageSquare },
                  { id: 'updates', label: 'STORIES', icon: Tv },
                  { id: 'call', label: 'CALLS', icon: Phone },
                  { id: 'profile', label: 'PROFILE', icon: Terminal },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundEffects.playClick();
                      setActiveTab(tab.id);
                      setMobileView('list');
                    }}
                    className={`py-1.5 px-1 rounded-sm text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 border transition-all ${isActive
                      ? 'bg-magnetic-oxide text-paper-display border-paper-display/40 bevel-raised shadow-md'
                      : 'bg-chassis-sand text-dark-oxide border-dark-oxide/40 hover:bg-paper-display'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: FEEDS (CHATS) LIST */}
          {activeTab === 'chats' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2 border-b border-dark-oxide/30 bg-cassette-housing/20 flex items-center justify-between">
                <div className="relative flex-1 mr-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-oxide-brown pointer-events-none" />
                  <input
                    type="text"
                    placeholder="SEARCH FEEDS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-paper-display border border-dark-oxide/40 rounded-sm text-xs font-mono text-dark-oxide bevel-recessed"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(['All', 'Favorites', 'Groups'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { soundEffects.playClick(); setFilterCategory(cat); }}
                      className={`px-1.5 py-1 text-[9px] font-bold uppercase rounded-sm border ${filterCategory === cat
                        ? 'bg-dark-oxide text-paper-display'
                        : 'bg-chassis-sand text-dark-oxide hover:bg-paper-display'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {loadingConversations ? (
                  <div className="p-8 text-center text-xs text-oxide-brown animate-pulse space-y-2">
                    <Disc className="w-8 h-8 mx-auto text-magnetic-oxide animate-tape-spool" />
                    <p>[READING TAPE RACK INDEX...]</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-oxide-brown space-y-2">
                    <Radio className="w-8 h-8 mx-auto text-oxide-brown" />
                    <p>[NO FEEDS FOUND]</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const details = getConversationDetails(conv);
                    const isActive = conv._id === activeConversationId;
                    const unreadCount = (user?._id && conv.unreadCounts) ? (conv.unreadCounts[user._id] || 0) : 0;
                    const isPinned = pinnedConversationIds.includes(conv._id);

                    return (
                      <motion.div
                        key={conv._id}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          soundEffects.playClick();
                          selectConversation(conv._id);
                          setMobileView('chat');
                        }}
                        className={`p-2.5 rounded-sm border border-dark-oxide/50 cursor-pointer transition-all relative group ${isActive
                          ? 'bg-paper-display text-dark-oxide bevel-recessed border-l-4 border-l-magnetic-oxide shadow-md'
                          : 'bg-chassis-sand hover:bg-paper-display/80 bevel-raised'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar
                              initials={details.name.slice(0, 2)}
                              src={details.avatar}
                              size="md"
                              presence={details.isOnline ? 'online' : 'offline'}
                            />
                            <Disc className={`w-3.5 h-3.5 absolute -top-1 -right-1 text-magnetic-oxide transition-transform ${isActive ? 'animate-tape-spool opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:animate-tape-spool'
                              }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-xs uppercase tracking-wider truncate text-dark-oxide">
                                {details.name}
                              </h3>
                              {conv.lastMessage && (
                                <span className="text-[9px] text-black font-mono shrink-0 ml-1">
                                  {formatTimeStr(conv.lastMessage.createdAt).slice(0, 5)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-[11px] text-black truncate font-mono">
                                {conv.lastMessage ? conv.lastMessage.content || '[BINARY ATTACHMENT]' : details.statusText}
                              </p>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {isPinned && <Pin className="w-3 h-3 text-magnetic-oxide" />}
                                {unreadCount > 0 && (
                                  <span className="mechanical-counter font-bold text-[10px]">
                                    {`[0 0 ${unreadCount}]`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPDATES / STORIES RACK */}
          {activeTab === 'updates' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              <div className="flex items-center justify-between border-b border-dark-oxide/30 pb-2">
                <span className="font-bold text-xs uppercase text-dark-oxide flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-magnetic-oxide" />
                  [STORIES RACK]
                </span>
                <button
                  onClick={() => setIsPostStoryModalOpen(true)}
                  className="px-2 py-1 bg-magnetic-oxide text-paper-display text-[10px] font-bold uppercase rounded-sm bevel-raised hover:bg-[#806761]"
                >
                  + POST STORY
                </button>
              </div>

              {loadingStories ? (
                <div className="p-8 text-center text-xs text-oxide-brown animate-pulse">
                  [READING STORY SPOOLS...]
                </div>
              ) : storiesGroups.length === 0 ? (
                <div className="p-8 text-center text-xs text-black space-y-2">
                  <Tv className="w-8 h-8 mx-auto text-oxide-brown" />
                  <p>[NO STORIES POSTED YET]</p>
                  <button
                    onClick={() => setIsPostStoryModalOpen(true)}
                    className="px-3 py-1 bg-magnetic-oxide text-paper-display text-[10px] uppercase font-bold rounded-sm bevel-raised"
                  >
                    POST FIRST STORY SPOOL
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {storiesGroups.map((group) => {
                    const isSelected = activeStoryGroup?.user._id === group.user._id;
                    return (
                      <div
                        key={group.user._id}
                        onClick={() => openStoryViewer(group)}
                        className={`p-3 border rounded-sm flex items-center justify-between cursor-pointer transition-all ${isSelected
                          ? 'bg-paper-display text-dark-oxide bevel-recessed border-l-4 border-l-magnetic-oxide shadow-md'
                          : 'bg-chassis-sand hover:bg-paper-display/80 bevel-raised border-dark-oxide/40'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-0.5 rounded-sm border-2 ${group.hasUnviewed ? 'border-emerald-500 animate-pulse' : 'border-dark-oxide/40'}`}>
                            <Avatar initials={group.user.username.slice(0, 2)} src={group.user.avatar} size="md" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs uppercase">{group.user.username}</h4>
                            <p className="text-[10px] text-oxide-brown">{group.stories.length} SPOOL SLIDE(S)</p>
                          </div>
                        </div>
                        <span className="text-[10px] mechanical-counter">
                          {group.hasUnviewed ? 'UNREAD' : 'VIEWED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CALLS LOG RACK */}
          {activeTab === 'call' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              <div className="flex items-center justify-between border-b border-dark-oxide/30 pb-2">
                <span className="font-bold text-xs uppercase text-dark-oxide flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-magnetic-oxide" />
                  [TRANSCEIVER CALL LOGS]
                </span>
              </div>

              {callLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-oxide-brown space-y-2">
                  <Phone className="w-8 h-8 mx-auto text-oxide-brown" />
                  <p>[NO TRANSCEIVER CALL LOGS RECORDED]</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {callLogs.map((log) => {
                    const isCaller = log.caller._id === user?._id;
                    const otherUser = isCaller ? log.receiver : log.caller;
                    return (
                      <div key={log._id} className="p-3 bg-paper-display border border-dark-oxide/40 rounded-sm flex items-center justify-between font-mono">
                        <div className="flex items-center gap-3">
                          <Avatar initials={otherUser?.username?.slice(0, 2) || 'OP'} src={otherUser?.avatar} size="sm" />
                          <div>
                            <h4 className="font-bold text-xs uppercase">{otherUser?.username || 'UNKNOWN'}</h4>
                            <span className="text-[10px] text-oxide-brown flex items-center gap-1">
                              {isCaller ? <PhoneOutgoing className="w-3 h-3 text-emerald-600" /> : <PhoneIncoming className="w-3 h-3 text-magnetic-oxide" />}
                              {log.type.toUpperCase()} CALL ({log.status.toUpperCase()})
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] mechanical-counter">{log.duration}s</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE CONSOLE RACK */}
          {activeTab === 'profile' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 font-mono text-xs">
              <div className="border-b border-dark-oxide/30 pb-2">
                <span className="font-bold uppercase text-dark-oxide">[USER PROFILE]</span>
              </div>

              <div className="p-4 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed text-center space-y-3">
                <div className="relative inline-block mx-auto group cursor-pointer" onClick={() => avatarFileInputRef.current?.click()}>
                  <Avatar
                    initials={user?.username?.slice(0, 2) || 'OP'}
                    src={user?.avatar}
                    size="xl"
                    className="mx-auto"
                    uploadProgress={avatarUploadProgress}
                    isUploading={isUploadingAvatar}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      avatarFileInputRef.current?.click();
                    }}
                    // className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#f97316] text-white shadow-lg hover:scale-110 active:scale-95 transition-transform border-2 border-dark-oxide flex items-center justify-center cursor-pointer"
                    title="Upload New Avatar Photo"
                  >
                    {/* <Camera className="w-4 h-4" /> */}
                  </button>
                </div>
                <h3 className="font-extrabold text-base uppercase">{user?.username}</h3>
                <p className="text-oxide-brown text-[11px]">{user?.email}</p>
                <Button onClick={() => setIsAvatarModalOpen(true)} variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-red-500" /> CHANGE AVATAR PHOTO
                </Button>
              </div>

              <div className="p-3 bg-paper-display border border-dark-oxide/40 rounded-sm bevel-raised space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-[10px] text-oxide-brown">[USER BIO]</span>
                  <button onClick={() => setEditingBio(!editingBio)} className="text-magnetic-oxide font-bold text-[10px]">
                    {editingBio ? 'CANCEL' : 'EDIT'}
                  </button>
                </div>
                {editingBio ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      className="w-full h-8 px-2 bg-paper-display border border-dark-oxide rounded-sm text-xs font-mono"
                    />
                    <Button onClick={handleSaveBio} variant="transmit" size="sm" className="w-full">
                      SAVE BIO
                    </Button>
                  </div>
                ) : (
                  <p className="text-dark-oxide text-xs">{user?.bio || 'NO BIO SPECIFIED'}</p>
                )}
              </div>

              <Button onClick={() => { logout(); router.push('/login'); }} variant="danger" className="w-full py-2.5">
                LOGOUT
              </Button>
            </div>
          )}
        </aside>

        {/* ========================================================================= */}
        {/* CENTER PANE: DYNAMIC CONTENT BASED ON ACTIVE TAB                           */}
        {/* ========================================================================= */}
        <main className={`flex-1 bg-paper-display flex flex-col min-w-0 relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}>

          {/* CENTER PANE VIEW 1: FEEDS (CHATS) TAB */}
          {activeTab === 'chats' && (
            activeConversation ? (
              <>
                {/* Header HUD */}
                <header className="p-3 border-b-2 border-dark-oxide bg-chassis-sand flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-1 bg-paper-display border border-dark-oxide rounded-sm text-dark-oxide"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <Avatar
                      initials={getConversationDetails(activeConversation).name.slice(0, 2)}
                      src={getConversationDetails(activeConversation).avatar}
                      size="sm"
                      presence={getConversationDetails(activeConversation).isOnline ? 'online' : 'offline'}
                    />

                    <div className="min-w-0">
                      <h2 className="font-extrabold text-sm uppercase tracking-wider text-dark-oxide truncate">
                        {getConversationDetails(activeConversation).name}
                      </h2>
                      <p className="text-[10px] text-black font-mono truncate">
                        {getConversationDetails(activeConversation).statusText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      onClick={() => setShowRightSidebar(!showRightSidebar)}
                      className="p-1.5 bg-paper-display border border-dark-oxide/50 rounded-sm text-dark-oxide hover:bg-magnetic-oxide hover:text-paper-display bevel-raised transition-all"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* Message Stream Feed */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 relative transition-colors duration-300 ${CHAT_THEMES.find((t) => t.id === selectedTheme)?.bgClass || 'bg-paper-display'}`}>
                  {loadingMessages ? (
                    <div className="p-12 text-center text-xs text-oxide-brown animate-pulse space-y-2">
                      <Disc className="w-10 h-10 mx-auto text-magnetic-oxide animate-tape-spool" />
                      <p>[LOADING MESSAGES FROM CHAT ...]</p>
                    </div>
                  ) : currentMessages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-oxide-brown space-y-2">
                      <Radio className="w-10 h-10 mx-auto text-oxide-brown" />
                      <p>[NO MESSAGE YET // START THE REAL TIME CONVERSATION]</p>
                    </div>
                  ) : (
                    currentMessages.map((msg) => {
                      const isMe = msg.sender._id === user?._id;
                      const timestampStr = formatTimeStr(msg.createdAt);
                      const otherParticipants = activeConversation?.participants.filter((p) => p._id !== user?._id) || [];
                      const isRead = msg.readBy && msg.readBy.some((rId: any) => {
                        const readUserId = typeof rId === 'object' ? rId._id : rId;
                        return otherParticipants.some((p) => p._id === readUserId);
                      });

                      return (
                        <motion.div
                          key={msg._id}
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 relative group`}
                        >
                          <div className="flex items-center gap-2 text-[10px] font-mono text-black px-1">
                            <span className="dyno-label">
                              {isMe ? ` ${user?.username?.toUpperCase()} ` : ` ${msg.sender.username?.toUpperCase()} `}
                            </span>
                            <span>{timestampStr}</span>
                          </div>

                          <div className="relative max-w-md sm:max-w-lg">
                            <div
                              className={`p-3 rounded-sm border-2 border-dark-oxide text-xs font-mono shadow-md relative ${isMe
                                ? 'bg-magnetic-oxide text-paper-display bevel-raised'
                                : 'bg-[#e7e7e7] text-[#2c2725] bevel-recessed font-semibold'
                                } ${stampedMsgId === msg._id ? 'animate-rubber-stamp' : ''}`}
                            >
                              {msg.content && <p className="leading-relaxed whitespace-pre-wrap font-bold text-[#2c2725]">{msg.content}</p>}

                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {msg.attachments.map((att, idx) => (
                                    <div key={idx}>
                                      {att.type === 'image' ? (
                                        <img
                                          src={att.url}
                                          alt={att.name || 'Attachment image'}
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80';
                                          }}
                                          className="rounded-sm border border-dark-oxide max-h-64 max-w-full object-cover shadow-sm cursor-pointer hover:opacity-95"
                                          onClick={() => window.open(att.url, '_blank')}
                                        />
                                      ) : att.type === 'audio' ? (
                                        <AudioPlayer src={att.url} name={att.name} isMe={isMe} />
                                      ) : (
                                        <a href={att.url} target="_blank" rel="noreferrer" className="p-2 rounded-sm bg-dark-oxide text-paper-display border border-black flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-magnetic-oxide" />
                                          <span className="truncate">{att.name}</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isMe && (
                                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-paper-display/80 font-mono">
                                  <span>STATUS:</span>
                                  {isRead ? (
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                      <span className="w-2 h-2 rounded-full led-bulb-green" />
                                      READ
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                                      <span className="w-2 h-2 rounded-full led-bulb-amber" />
                                      DELIVERED
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {msg.reactions.map((r, rIdx) => (
                                  <span
                                    key={rIdx}
                                    onClick={() => handleAddReaction(msg._id, r.emoji)}
                                    className="px-2 py-0.5 rounded-sm bg-dark-oxide text-paper-display border border-black text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer hover:bg-black transition-colors"
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="text-[10px] text-magnetic-oxide">{(r as any).users?.length || 1}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className={`absolute top-1 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity z-20`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowEmojiPickerForMsgId(showEmojiPickerForMsgId === msg._id ? null : msg._id);
                                }}
                                className="p-1 rounded-sm bg-dark-oxide text-paper-display hover:bg-black border border-black shadow-sm"
                                title="React with emoji"
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>

                              {showEmojiPickerForMsgId === msg._id && (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={`absolute ${isMe ? 'right-0' : 'left-0'} top-7 z-40 p-2 bg-chassis-sand border-2 border-dark-oxide rounded-sm shadow-2xl flex items-center gap-1.5 whitespace-nowrap`}
                                >
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleAddReaction(msg._id, emoji)}
                                      className="p-1 text-sm hover:scale-125 transition-transform"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}

                  <TypingIndicator typingUsers={activeTypingNames} />
                  <div ref={messagesEndRef} />
                </div>

                {/* INPUT TERMINAL */}
                <footer className="p-3 border-t-2 border-dark-oxide bg-chassis-sand shrink-0 shadow-lg">
                  {attachmentPreview && (
                    <div className="mb-2 p-2 bg-paper-display border border-dark-oxide rounded-sm flex items-center justify-between text-xs font-mono shadow-sm">
                      <span className="flex items-center gap-2 truncate">
                        {attachmentPreview.type === 'image' ? (
                          <img src={attachmentPreview.url} alt="preview" className="w-8 h-8 object-cover rounded border border-dark-oxide shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-magnetic-oxide shrink-0" />
                        )}
                        <span className="truncate">{attachmentPreview.name}</span>
                        {attachmentPreview.isUploading ? (
                          <span className="text-[10px] text-amber-600 font-bold animate-pulse uppercase">[UPLOADING TO SERVER...]</span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold uppercase">[READY FOR TRANSMISSION]</span>
                        )}
                      </span>
                      <button onClick={() => setAttachmentPreview(null)} className="text-dark-oxide hover:text-danger p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-sm bg-paper-display border border-dark-oxide/50 text-dark-oxide hover:bg-magnetic-oxide hover:text-paper-display bevel-raised"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        placeholder={isRecording ? `[RECORDING VOICE NOTE: 00:${recordingTime.toString().padStart(2, '0')}]` : "type a message..."}
                        value={messageInput}
                        onChange={handleInputChange}
                        disabled={isRecording}
                        className={`w-full h-10 px-3 ${isRecording ? 'pr-28 text-danger font-bold' : 'pr-12'} bg-paper-display border border-dark-oxide/50 rounded-sm text-xs font-mono text-dark-oxide bevel-recessed placeholder:text-oxide-brown/70 focus:outline-none focus:border-magnetic-oxide`}
                      />

                      {/* VOICE RECORDING MIC BUTTON EXACTLY IN THE BOXED POSITION FROM PHOTO 1 & MATCHING DESIGN IN PHOTO 2 */}
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                        {isRecording && (
                          <span className="text-[10px] text-danger font-mono font-bold animate-pulse mr-0.5">
                            00:{recordingTime.toString().padStart(2, '0')}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          title={isRecording ? "Stop Voice Recording" : "Start Voice Recording"}
                          className={`p-1 rounded-sm border transition-all relative flex items-center justify-center shadow-sm shrink-0 cursor-pointer ${isRecording
                            ? 'bg-danger text-paper-display border-black bevel-recessed'
                            : 'bg-[#beb4ad] border-dark-oxide/70 text-dark-oxide hover:bg-magnetic-oxide hover:text-paper-display bevel-raised'
                            }`}
                          style={{ width: '28px', height: '28px' }}
                        >
                          <Mic className="w-4 h-4" />
                          {/* Red LED indicator dot on bottom right corner as shown in photo reference */}
                          <span
                            className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isRecording
                              ? 'bg-red-500 shadow-[0_0_6px_#ef4444] animate-ping'
                              : 'bg-red-600 shadow-[0_0_3px_#dc2626]'
                              }`}
                          />
                        </button>
                      </div>
                    </div>

                    <Button type="submit" variant="transmit" size="md" className="h-10 px-5 shrink-0">
                      send <Send className="w-4 h-4 ml-1" />
                    </Button>
                  </form>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-paper-display space-y-4">
                <Disc className="w-16 h-16 text-magnetic-oxide animate-tape-spool" />
                <h2 className="font-extrabold text-lg uppercase tracking-wider text-dark-oxide font-display">
                  Select a Chat to Start Messaging
                </h2>
                <p className="text-xs text-oxide-brown max-w-sm font-mono">
                  Choose a conversation from the sidebar or click (+) to start a new chat with real-time updates.
                </p>
              </div>
            )
          )}

          {/* CENTER PANE VIEW 2: STORIES (UPDATES) TAB - DISPLAYED RIGHT IN THE CENTER BOX! */}
          {activeTab === 'updates' && (
            <div className="flex-1 bg-paper-display flex flex-col min-w-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-mono text-dark-oxide">
              {activeStoryGroup && activeStory ? (
                <div className="w-full max-w-2xl mx-auto flex flex-col space-y-4">

                  {/* Story Center Header */}
                  <div className="bg-chassis-sand border-2 border-dark-oxide p-3.5 rounded-sm bevel-raised flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setMobileView('list')} className="md:hidden p-1 bg-paper-display border border-dark-oxide rounded-sm text-dark-oxide">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <Avatar initials={activeStoryGroup.user.username.slice(0, 2)} src={activeStoryGroup.user.avatar} size="md" />
                      <div>
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-dark-oxide">
                          OPERATOR {activeStoryGroup.user.username}
                        </h3>
                        <p className="text-[10px] text-oxide-brown font-mono">
                          SPOOL SLIDE {activeStoryIndex + 1} OF {activeStoryGroup.stories.length} // {formatTimeStr(activeStory.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeStoryGroup.user._id === user?._id && (
                        <button
                          onClick={() => handleDeleteStory(activeStory._id)}
                          className="px-2 py-1 bg-danger text-paper-display text-[10px] font-bold uppercase rounded-sm bevel-raised hover:bg-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> DELETE
                        </button>
                      )}
                      <button
                        onClick={() => setIsPostStoryModalOpen(true)}
                        className="px-3 py-1 bg-magnetic-oxide text-paper-display text-[10px] font-bold uppercase rounded-sm bevel-raised hover:bg-[#806761]"
                      >
                        + POST STORY
                      </button>
                    </div>
                  </div>

                  {/* Retro CRT Story Media Display Box */}
                  <div className="bg-dark-oxide text-paper-display border-4 border-dark-oxide rounded-sm p-4 bevel-recessed shadow-2xl relative flex flex-col items-center justify-center min-h-[420px] crt-overlay">

                    {activeStory.mediaUrl ? (
                      <img
                        src={activeStory.mediaUrl}
                        alt="Story Spool Media"
                        className="max-h-[460px] w-full object-contain rounded-sm border border-paper-display/20 shadow-lg"
                      />
                    ) : (
                      <div className="p-10 text-center font-bold text-lg text-paper-display space-y-4 max-w-md">
                        <Disc className="w-12 h-12 mx-auto text-magnetic-oxide animate-tape-spool" />
                        <p className="leading-relaxed font-mono uppercase tracking-wide">{activeStory.caption}</p>
                      </div>
                    )}

                    {activeStory.caption && activeStory.mediaUrl && (
                      <div className="mt-3 p-2 bg-chassis-sand text-dark-oxide rounded-sm border border-dark-oxide w-full text-center font-bold text-xs uppercase tracking-wider bevel-raised">
                        {activeStory.caption}
                      </div>
                    )}
                  </div>

                  {/* Story Slide Controls & Viewers Bar */}
                  <div className="bg-chassis-sand border-2 border-dark-oxide p-3 rounded-sm bevel-raised flex items-center justify-between font-mono text-xs shadow-md">
                    <div className="flex items-center gap-1 text-[11px] text-black">
                      <Eye className="w-4 h-4 text-magnetic-oxide" />
                      <span> VIEWS: <strong>{activeStory.views?.length || 0} USERS</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={activeStoryIndex === 0}
                        onClick={() => { soundEffects.playClick(); setActiveStoryIndex(activeStoryIndex - 1); }}
                        className="px-3 py-1 bg-paper-display border border-dark-oxide rounded-sm text-dark-oxide disabled:opacity-40 bevel-raised hover:bg-magnetic-oxide hover:text-paper-display flex items-center gap-1 font-bold"
                      >
                        <ChevronLeft className="w-4 h-4" /> PREV
                      </button>
                      <button
                        disabled={activeStoryIndex >= activeStoryGroup.stories.length - 1}
                        onClick={() => { soundEffects.playClick(); setActiveStoryIndex(activeStoryIndex + 1); }}
                        className="px-3 py-1 bg-paper-display border border-dark-oxide rounded-sm text-dark-oxide disabled:opacity-40 bevel-raised hover:bg-magnetic-oxide hover:text-paper-display flex items-center gap-1 font-bold"
                      >
                        NEXT <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 relative">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden absolute top-4 left-4 p-1.5 bg-paper-display border border-dark-oxide rounded-sm text-dark-oxide flex items-center gap-1 text-xs font-bold shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" /> BACK TO STORIES
                  </button>
                  <Tv className="w-16 h-16 text-magnetic-oxide" />
                  <h2 className="font-extrabold text-lg uppercase tracking-wider text-dark-oxide">
                    NO STORY POSTED YET.
                  </h2>
                  <p className="text-xs text-oxide-brown max-w-sm">
                    SELECT A STORY FROM THE LEFT RACK OR CLICK &apos;+ POST STORY&apos; TO BROADCAST A NEW STORY.
                  </p>
                  <button
                    onClick={() => setIsPostStoryModalOpen(true)}
                    className="px-4 py-2 bg-magnetic-oxide text-paper-display text-xs font-bold uppercase tracking-wider rounded-sm bevel-raised hover:bg-[#806761]"
                  >
                    + POST NEW STORY
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CENTER PANE VIEW 3: CALLS TAB */}
          {activeTab === 'call' && (
            <div className="flex-1 bg-paper-display flex flex-col min-w-0 p-6 overflow-y-auto custom-scrollbar font-mono text-dark-oxide space-y-4">
              <div className="bg-chassis-sand border-2 border-dark-oxide p-4 rounded-sm bevel-raised flex items-center justify-between shadow-md">
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-dark-oxide flex items-center gap-2">
                  <Phone className="w-5 h-5 text-magnetic-oxide" />
                  TRANSCEIVER CALL LOGS STATION
                </h2>
                <span className="mechanical-counter">LOGS: {callLogs.length}</span>
              </div>

              {callLogs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <Phone className="w-16 h-16 text-oxide-brown" />
                  <p className="text-xs text-oxide-brown">NO CALL LOGS RECORDED YET</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl mx-auto w-full">
                  {callLogs.map((log) => {
                    const isCaller = log.caller._id === user?._id;
                    const otherUser = isCaller ? log.receiver : log.caller;
                    return (
                      <div key={log._id} className="p-4 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <Avatar initials={otherUser?.username?.slice(0, 2) || 'OP'} src={otherUser?.avatar} size="md" />
                          <div>
                            <h4 className="font-bold text-sm uppercase">{otherUser?.username || 'UNKNOWN OPERATOR'}</h4>
                            <p className="text-xs text-oxide-brown">{formatTimeStr(log.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="dyno-label text-[9px]">{log.type.toUpperCase()} // {log.status.toUpperCase()}</span>
                          <p className="text-xs font-bold mechanical-counter">{log.duration}s</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CENTER PANE VIEW 4: PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="flex-1 bg-paper-display flex flex-col min-w-0 p-6 overflow-y-auto custom-scrollbar font-mono text-dark-oxide space-y-4">
              <div className="bg-chassis-sand border-2 border-dark-oxide p-4 rounded-sm bevel-raised flex items-center justify-between shadow-md max-w-2xl mx-auto w-full">
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-dark-oxide flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-magnetic-oxide" />
                  OPERATOR CONTROL CONSOLE
                </h2>
                {/* <span className="mechanical-counter">ID: DECK-84</span> */}
              </div>

              <div className="p-6 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed max-w-2xl mx-auto w-full space-y-5 shadow-lg">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="relative inline-block mx-auto group cursor-pointer" onClick={() => avatarFileInputRef.current?.click()}>
                    <Avatar initials={user?.username?.slice(0, 2) || 'OP'} src={user?.avatar} size="xl" className="mx-auto" />
                    {/* <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        avatarFileInputRef.current?.click();
                      }}
                      className="absolute -bottom-1 -right-1 p-2.5 rounded-full bg-[#f97316] text-white shadow-lg hover:scale-110 active:scale-95 transition-transform border-2 border-dark-oxide flex items-center justify-center cursor-pointer"
                      title="Upload New Avatar Photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button> */}
                  </div>
                  <h3 className="font-extrabold text-xl uppercase tracking-wider">{user?.username}</h3>
                  <p className="text-xs text-oxide-brown">{user?.email}</p>
                  <Button onClick={() => setIsAvatarModalOpen(true)} variant="outline" size="sm" className="flex items-center justify-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#f97316]" /> UPLOAD AVATAR PHOTO
                  </Button>
                </div>

                <div className="p-4 bg-chassis-sand border border-dark-oxide/40 rounded-sm bevel-raised space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-xs text-dark-oxide">[OPERATOR BIO]</span>
                    <button onClick={() => setEditingBio(!editingBio)} className="text-magnetic-oxide font-bold text-xs">
                      {editingBio ? 'CANCEL' : 'EDIT BIO'}
                    </button>
                  </div>
                  {editingBio ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value)}
                        className="w-full h-9 px-3 bg-paper-display border border-dark-oxide rounded-sm text-xs font-mono"
                      />
                      <Button onClick={handleSaveBio} variant="transmit" size="sm" className="w-full">
                        SAVE BIO
                      </Button>
                    </div>
                  ) : (
                    <p className="text-dark-oxide text-xs font-semibold">{user?.bio || 'NO BIO SPECIFIED'}</p>
                  )}
                </div>

                <Button onClick={() => { logout(); router.push('/login'); }} variant="danger" className="w-full py-3 text-sm">
                  LOGOUT
                </Button>
              </div>
            </div>
          )}

        </main>

        {/* RIGHT PANE: PROFILE & THEME SIDEBAR */}
        {showRightSidebar && activeConversation && (
          <aside className="w-80 bg-chassis-sand border-l-2 border-dark-oxide flex flex-col shrink-0 font-mono text-xs p-4 space-y-4 shadow-xl overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-dark-oxide/30 pb-2">
              <span className="font-bold text-xs uppercase text-dark-oxide tracking-wider font-mono">PROFILE INFORMATION</span>
              <button onClick={() => setShowRightSidebar(false)} className="text-dark-oxide hover:text-danger p-1 rounded-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Group or Direct Profile Card */}
            {activeConversation.type === 'group' ? (
              <div className="space-y-4">
                {/* Group Avatar Card */}
                <div className="space-y-2">
                  <span className="font-bold uppercase text-black text-[10px] tracking-wider">[GROUP PROFILE]</span>
                  <div className="p-4 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed flex flex-col items-center text-center space-y-3 shadow-md relative">
                    <input
                      type="file"
                      ref={groupAvatarFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGroupAvatarFileUpload(file);
                      }}
                    />
                    <Avatar
                      initials={activeConversation.name?.slice(0, 2) || 'GP'}
                      src={activeConversation.avatar}
                      size="xl"
                      className="border-2 border-magnetic-oxide shadow-md"
                    />
                    <Button
                      type="button"
                      onClick={() => groupAvatarFileInputRef.current?.click()}
                      variant="secondary"
                      size="sm"
                      className="text-[10px] py-1 font-bold uppercase flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-[#f97316]" /> CHANGE GROUP ICON
                    </Button>

                    <div className="w-full space-y-1 pt-1">
                      {editingGroupName ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={groupNameInput}
                            onChange={(e) => setGroupNameInput(e.target.value)}
                            className="w-full h-8 px-2 bg-paper-display border border-dark-oxide rounded-sm text-xs font-mono"
                          />
                          <Button onClick={handleSaveGroupName} variant="transmit" size="sm" className="h-8 text-[10px]">
                            SAVE
                          </Button>
                          <button onClick={() => setEditingGroupName(false)} className="text-xs text-danger font-bold px-1">
                            X
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <h3 className="font-extrabold uppercase text-dark-oxide text-sm font-mono tracking-wider">
                            {activeConversation.name || 'GROUP'}
                          </h3>
                          {activeConversation.groupAdmin && (
                            (typeof activeConversation.groupAdmin === 'object' ? activeConversation.groupAdmin._id === user?._id : activeConversation.groupAdmin === user?._id)
                          ) && (
                              <button
                                onClick={() => { setGroupNameInput(activeConversation.name || ''); setEditingGroupName(true); }}
                                className="text-magnetic-oxide hover:text-dark-oxide p-0.5"
                                title="Edit Group Name"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      )}
                      <p className="text-[10px] text-oxide-brown font-mono">
                        {activeConversation.participants.length} MEMBERS CONNECTED
                      </p>
                    </div>
                  </div>
                </div>

                {/* Group Bio / Description */}
                <div className="p-3.5 bg-chassis-sand border-2 border-dark-oxide/60 rounded-sm bevel-raised space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] text-dark-oxide tracking-wider">
                      [GROUP BIO / DESCRIPTION]
                    </span>
                    {activeConversation.groupAdmin && (
                      (typeof activeConversation.groupAdmin === 'object' ? activeConversation.groupAdmin._id === user?._id : activeConversation.groupAdmin === user?._id)
                    ) && (
                        <button
                          onClick={() => {
                            setGroupBioInput(activeConversation.description || '');
                            setEditingGroupBio(!editingGroupBio);
                          }}
                          className="text-magnetic-oxide font-bold text-[10px]"
                        >
                          {editingGroupBio ? 'CANCEL' : 'EDIT BIO'}
                        </button>
                      )}
                  </div>
                  {editingGroupBio ? (
                    <div className="space-y-2">
                      <textarea
                        value={groupBioInput}
                        onChange={(e) => setGroupBioInput(e.target.value)}
                        rows={2}
                        className="w-full p-2 bg-paper-display border border-dark-oxide rounded-sm text-xs font-mono"
                      />
                      <Button onClick={handleSaveGroupBio} variant="transmit" size="sm" className="w-full text-[10px]">
                        SAVE GROUP BIO
                      </Button>
                    </div>
                  ) : (
                    <p className="text-dark-oxide font-bold italic bg-paper-display p-2.5 rounded-sm border border-dark-oxide/30 leading-relaxed">
                      "{activeConversation.description || 'NO BIO SPECIFIED'}"
                    </p>
                  )}
                </div>

                {/* Group Members List */}
                <div className="space-y-2 font-mono">
                  <span className="font-extrabold uppercase text-[10px] text-dark-oxide tracking-wider block">
                    [GROUP MEMBERS ({activeConversation.participants.length})]
                  </span>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed shadow-inner">
                    {activeConversation.participants.map((member) => {
                      const adminId = typeof activeConversation.groupAdmin === 'object' ? activeConversation.groupAdmin?._id : activeConversation.groupAdmin || activeConversation.participants[0]?._id;
                      const isAdmin = member._id === adminId;
                      const isSelf = member._id === user?._id;
                      const isCurrentUserAdmin = user?._id === adminId;
                      return (
                        <div
                          key={member._id}
                          className="p-2 bg-chassis-sand border border-dark-oxide/40 rounded-sm flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar initials={member.username.slice(0, 2)} src={member.avatar} size="xs" presence={onlineUserIds.has(member._id) ? 'online' : 'offline'} />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1 truncate">
                                <span className="font-bold uppercase text-[11px] truncate">{member.username}</span>
                                {isSelf && <span className="text-[9px] text-oxide-brown">(YOU)</span>}
                              </div>
                              <span className="text-[9px] font-bold text-magnetic-oxide uppercase">
                                {isAdmin ? '[ADMIN]' : '[MEMBER]'}
                              </span>
                            </div>
                          </div>

                          {isCurrentUserAdmin && !isSelf && (
                            <div className="flex items-center gap-1 shrink-0">
                              {!isAdmin && (
                                <button
                                  onClick={() => makeGroupAdmin(activeConversation._id, member._id)}
                                  className="px-1.5 py-0.5 bg-magnetic-oxide text-paper-display text-[9px] font-bold uppercase rounded hover:bg-[#806761]"
                                  title="Promote to Admin"
                                >
                                  MAKE ADMIN
                                </button>
                              )}
                              <button
                                onClick={() => removeGroupMember(activeConversation._id, member._id)}
                                className="px-1.5 py-0.5 bg-danger text-paper-display text-[9px] font-bold uppercase rounded hover:bg-red-700"
                                title="Remove Member"
                              >
                                REMOVE
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leave Group Action Button */}
                <Button
                  onClick={handleLeaveGroupAction}
                  variant="danger"
                  className="w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> LEAVE GROUP CHAT
                </Button>
              </div>
            ) : (
              /* User Profile Card */
              <>
                <div className="space-y-2">
                  <span className="font-bold uppercase text-black text-[10px] tracking-wider">[USER PROFILE]</span>
                  <div className="p-4 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed flex flex-col items-center text-center space-y-3 shadow-md">
                    <Avatar
                      initials={getConversationDetails(activeConversation).name.slice(0, 2)}
                      src={getConversationDetails(activeConversation).avatar}
                      size="xl"
                      presence={getConversationDetails(activeConversation).isOnline ? 'online' : 'offline'}
                      className="border-2 border-magnetic-oxide shadow-md"
                    />
                    <div>
                      <h3 className="font-extrabold uppercase text-dark-oxide text-sm font-mono tracking-wider">
                        {getConversationDetails(activeConversation).name}
                      </h3>
                      <p className="text-[10px] text-oxide-brown font-mono mt-0.5">
                        {getConversationDetails(activeConversation).isOnline ? 'Online now' : 'Last seen recently'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* About / Bio Box */}
                <div className="p-3.5 bg-chassis-sand border-2 border-dark-oxide/60 rounded-sm bevel-raised space-y-2 text-xs font-mono">
                  <span className="font-extrabold uppercase text-[10px] text-dark-oxide tracking-wider block">
                    [ABOUT / BIO]
                  </span>
                  <p className="text-dark-oxide font-bold italic bg-paper-display p-2.5 rounded-sm border border-dark-oxide/30 leading-relaxed">
                    "{getConversationDetails(activeConversation).description || 'NO BIO SPECIFIED'}"
                  </p>
                  {getConversationDetails(activeConversation).otherUser?.email && (
                    <p className="text-[11px] text-black font-mono truncate px-1 font-semibold">
                      {getConversationDetails(activeConversation).otherUser?.email}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Chat Theme & Wallpaper Section */}
            <div className="space-y-2 font-mono pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-dark-oxide tracking-wider">
                <Palette className="w-4 h-4 text-magnetic-oxide" />
                <span>Chat Theme & Wallpaper</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 p-3 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed shadow-inner">
                {CHAT_THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        soundEffects.playClick();
                        setSelectedTheme(theme.id);
                      }}
                      className="flex flex-col items-center gap-1 group focus:outline-none"
                    >
                      <div
                        className={`w-9 h-9 rounded-full ${theme.swatchBg} flex items-center justify-center border-2 transition-all group-hover:scale-110 shadow-sm ${isSelected ? 'border-magnetic-oxide ring-2 ring-magnetic-oxide/50 scale-105' : 'border-dark-oxide/40'
                          }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-magnetic-oxide font-extrabold' : 'text-dark-oxide/80'}`}>
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* MODALS */}
      <Modal open={isNewChatModalOpen} onClose={() => { setIsNewChatModalOpen(false); setUserSearchInput(''); }} title="START A NEW CHAT">
        <div className="space-y-4 font-mono text-xs">
          <Input label="SEARCH USERNAME" placeholder="Type username..." value={userSearchInput} onChange={(e) => handleSearchUsers(e.target.value)} />
          <div className="max-h-60 overflow-y-auto space-y-2 p-1 bg-chassis-sand border border-dark-oxide/30 rounded-sm">
            {userSearchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-oxide-brown font-mono">
                [NO USERS FOUND]
              </div>
            ) : (
              userSearchResults.map((u) => (
                <div key={u._id} onClick={() => handleStartDirectChat(u._id)} className="p-2 bg-paper-display border border-dark-oxide/40 rounded-sm flex items-center justify-between cursor-pointer hover:bg-magnetic-oxide hover:text-paper-display transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar initials={u.username.slice(0, 2)} src={u.avatar} size="xs" presence={u.status || 'offline'} />
                    <div className="flex flex-col">
                      <span className="font-bold uppercase text-xs">{u.username}</span>
                      <span className="text-[9px] text-oxide-brown">{u.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-dark-oxide text-paper-display px-2 py-0.5 rounded-sm">[CONNECT]</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal open={isGroupModalOpen} onClose={() => { setIsGroupModalOpen(false); setSelectedGroupMembers([]); setUserSearchInput(''); }} title="Create Group Chat">
        <div className="space-y-4 font-mono text-xs">
          <Input label="GROUP NAME" placeholder="e.g. Squad / Crew" value={groupName} onChange={(e) => setGroupName(e.target.value)} />

          <Input label="SEARCH USERNAME" placeholder="Type username..." value={userSearchInput} onChange={(e) => handleSearchUsers(e.target.value)} />

          {/* Selected Group Members Badges */}
          {selectedGroupMembers.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-dark-oxide font-bold uppercase block">
                SELECTED MEMBERS ({selectedGroupMembers.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 p-2 bg-paper-display border border-dark-oxide/40 rounded-sm max-h-24 overflow-y-auto">
                {selectedGroupMembers.map((memberId) => {
                  const memberObj = userSearchResults.find((u) => u._id === memberId);
                  const name = memberObj?.username || 'User';
                  return (
                    <span
                      key={memberId}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-magnetic-oxide text-paper-display text-[10px] font-bold rounded-sm border border-dark-oxide"
                    >
                      {name.toUpperCase()}
                      <button
                        type="button"
                        onClick={() => setSelectedGroupMembers((prev) => prev.filter((id) => id !== memberId))}
                        className="hover:text-amber-200 font-extrabold"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Search & Selection List */}
          <div className="space-y-1">
            <span className="text-[10px] text-dark-oxide font-bold uppercase block">
              SELECT USERS TO ADD:
            </span>
            <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-dark-oxide/30 rounded-sm bg-chassis-sand">
              {userSearchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-oxide-brown font-mono">
                  [NO USERS FOUND]
                </div>
              ) : (
                userSearchResults.map((u) => {
                  const isSelected = selectedGroupMembers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => {
                        soundEffects.playClick();
                        if (isSelected) {
                          setSelectedGroupMembers((prev) => prev.filter((id) => id !== u._id));
                        } else {
                          setSelectedGroupMembers((prev) => [...prev, u._id]);
                        }
                      }}
                      className={`p-2 border rounded-sm flex items-center justify-between cursor-pointer transition-colors ${isSelected
                        ? 'bg-magnetic-oxide text-paper-display border-dark-oxide font-bold shadow-sm'
                        : 'bg-paper-display text-dark-oxide border-dark-oxide/40 hover:bg-cassette-housing/40'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar initials={u.username.slice(0, 2)} src={u.avatar} size="xs" presence={u.status || 'offline'} />
                        <div className="flex flex-col">
                          <span className="font-bold text-xs uppercase">{u.username}</span>
                          <span className="text-[9px] opacity-80">{u.email}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${isSelected
                        ? 'bg-paper-display text-dark-oxide border-paper-display'
                        : 'bg-dark-oxide text-paper-display border-dark-oxide'
                        }`}>
                        {isSelected ? '✓ SELECTED' : '+ ADD'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Button
            onClick={handleCreateGroup}
            variant="transmit"
            className="w-full py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            CREATE GROUP CHAT ({selectedGroupMembers.length} MEMBERS)
          </Button>
        </div>
      </Modal>

      {/* POST STORY MODAL */}
      <Modal open={isPostStoryModalOpen} onClose={() => setIsPostStoryModalOpen(false)} title="POST MAGNETIC STORY SPOOL">
        <form onSubmit={handlePostStory} className="space-y-4 font-mono text-xs">
          <input
            type="file"
            ref={storyFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleStoryFileUpload(file);
            }}
          />

          {!storyImageUrl ? (
            <div
              onClick={() => storyFileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-[#f97316] rounded-xl bg-[#1c1817] hover:bg-[#282220] transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group shadow-inner"
            >
              <div className="p-3 rounded-full bg-[#f97316]/10 text-[#f97316] group-hover:scale-110 transition-transform">
                {uploadingStoryImage ? (
                  <Radio className="w-8 h-8 text-[#f97316] animate-pulse" />
                ) : (
                  <Camera className="w-8 h-8 text-[#f97316]" />
                )}
              </div>
              <span className="font-extrabold text-xs uppercase tracking-wider text-white">
                {uploadingStoryImage ? '[UPLOADING STORY PHOTO...]' : 'UPLOAD PHOTO'}
              </span>
              <span className="text-[10px] text-oxide-brown text-center">
                Click to select an image from your device (JPG, PNG, WEBP)
              </span>
            </div>
          ) : (
            <div className="relative w-full h-48 bg-black/60 border-2 border-dark-oxide rounded-md overflow-hidden flex items-center justify-center group">
              <img src={storyImageUrl} alt="Story preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Button
                  type="button"
                  onClick={() => storyFileInputRef.current?.click()}
                  variant="secondary"
                  size="sm"
                  className="text-xs font-bold"
                >
                  CHANGE PHOTO
                </Button>
                <Button
                  type="button"
                  onClick={() => setStoryImageUrl('')}
                  variant="danger"
                  size="sm"
                  className="text-xs font-bold"
                >
                  REMOVE
                </Button>
              </div>
              <div className="absolute top-2 left-2 bg-emerald-500/90 text-black font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                [PHOTO ATTACHED]
              </div>
            </div>
          )}

          <Input
            label="CAPTION / TRANSMISSION TEXT"
            placeholder="Enter story text..."
            value={storyCaption}
            onChange={(e) => setStoryCaption(e.target.value)}
          />

          <Button type="submit" variant="transmit" loading={uploadingStoryImage} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider">
            POST STORY SPOOL
          </Button>
        </form>
      </Modal>

      {/* CHANGE AVATAR MODAL */}
      <Modal open={isAvatarModalOpen} onClose={() => { if (!isUploadingAvatar) setIsAvatarModalOpen(false); }} title="UPDATE OPERATOR AVATAR">
        <div className="space-y-4 font-mono text-xs">
          <input
            type="file"
            ref={avatarFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarFileUpload(file);
            }}
          />

          {/* Avatar Preview with 0-100% Progress Ring Overlay */}
          <div className="flex flex-col items-center justify-center p-4 bg-chassis-sand border border-dark-oxide/40 rounded-sm bevel-recessed space-y-2">
            <Avatar
              initials={user?.username?.slice(0, 2) || 'OP'}
              src={user?.avatar}
              size="xl"
              className="shadow-md mx-auto"
              uploadProgress={avatarUploadProgress}
              isUploading={isUploadingAvatar}
            />
            {isUploadingAvatar && (
              <div className="text-center space-y-1">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-magnetic-oxide mechanical-counter animate-pulse block">
                  [TELEMETRY UPLOADING: {avatarUploadProgress ?? 0}%]
                </span>
                <div className="w-48 h-2 bg-dark-oxide rounded-full overflow-hidden border border-black p-0.5 mx-auto">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-150"
                    style={{ width: `${avatarUploadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* DASHED UPLOAD PHOTO DROPZONE */}
          <div
            onClick={() => { if (!isUploadingAvatar) avatarFileInputRef.current?.click(); }}
            className={`w-full p-8 border-2 border-dashed border-[#f97316] rounded-xl bg-[#1c1817] transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group shadow-inner ${isUploadingAvatar ? 'opacity-60 pointer-events-none' : 'hover:bg-[#282220]'}`}
          >
            <div className="p-3 rounded-full bg-[#f97316]/10 text-[#f97316] group-hover:scale-110 transition-transform">
              {isUploadingAvatar ? (
                <Radio className="w-8 h-8 text-[#f97316] animate-pulse" />
              ) : (
                <Camera className="w-8 h-8 text-[#f97316]" />
              )}
            </div>
            <span className="font-extrabold text-xs uppercase tracking-wider text-white">
              {isUploadingAvatar ? `[UPLOADING PHOTO: ${avatarUploadProgress ?? 0}%]` : 'UPLOAD PHOTO'}
            </span>
            <span className="text-[10px] text-oxide-brown text-center">
              Click to select an image from your device (JPG, PNG, WEBP)
            </span>
          </div>
        </div>
      </Modal>
    </main>
  );
}
