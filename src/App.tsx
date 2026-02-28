import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, User, Send, MessageSquare, Heart, Share2, MoreHorizontal, LogOut, Settings, Bell, Search, Home, Users, Video, ShoppingBag, Trash2, Key, Calendar, Mail, UserPlus, Check, X } from 'lucide-react';

interface Post {
  id: number;
  content: string;
  display_name: string;
  created_at: string;
  user_id: number;
}

interface UserSettings {
  language: 'en' | 'ru';
  theme: 'light' | 'dark';
  profile_visibility: 'public' | 'friends' | 'private';
  show_online_status: number;
}

interface UserData {
  id: number;
  username: string;
  display_name: string;
  gender?: string;
  dob?: string;
  avatar_url?: string;
  settings?: UserSettings;
}

const translations = {
  en: {
    welcome: 'Welcome to Litebook',
    privacy_first: 'Privacy-first social network',
    feed: 'Feed',
    friends: 'Friends',
    messages: 'Messages',
    profile: 'Profile',
    privacy_center: 'Privacy Center',
    security_checkup: 'Security Checkup',
    settings: 'Settings',
    logout: 'Logout',
    post_placeholder: "What's on your mind?",
    post_button: 'Post',
    encrypted: 'End-to-end encrypted',
    save_changes: 'Save Changes',
    find_friends: 'Find Friends',
    your_friends: 'Your Friends',
    search_placeholder: 'Search...',
    secure_chat: 'Secure Chat',
    type_message: 'Type a secure message...',
    privacy_insights: 'Privacy Insights',
    data_collected: 'Data Collected',
    ad_tracking: 'Ad Tracking',
    encryption: 'Encryption',
    active: 'Active',
    disabled: 'Disabled',
    language: 'Language',
    theme: 'Theme',
    visibility: 'Profile Visibility',
    online_status: 'Show Online Status',
    change_password: 'Change Password',
    current_password: 'Current Password',
    new_password: 'New Password',
    login_history: 'Login History',
    export_data: 'Export My Data',
    delete_account: 'Delete Account',
    danger_zone: 'Danger Zone',
    delete_warning: 'This action is permanent and will delete all your data.',
    export_warning: 'Download a copy of all your posts, messages, and profile data.',
  },
  ru: {
    welcome: 'Добро пожаловать в Litebook',
    privacy_first: 'Социальная сеть с приоритетом приватности',
    feed: 'Лента',
    friends: 'Друзья',
    messages: 'Сообщения',
    profile: 'Профиль',
    privacy_center: 'Центр приватности',
    security_checkup: 'Проверка безопасности',
    settings: 'Настройки',
    logout: 'Выйти',
    post_placeholder: 'О чем вы думаете?',
    post_button: 'Опубликовать',
    encrypted: 'Сквозное шифрование',
    save_changes: 'Сохранить изменения',
    find_friends: 'Найти друзей',
    your_friends: 'Ваши друзья',
    search_placeholder: 'Поиск...',
    secure_chat: 'Безопасный чат',
    type_message: 'Введите сообщение...',
    privacy_insights: 'Обзор приватности',
    data_collected: 'Сбор данных',
    ad_tracking: 'Рекламное отслеживание',
    encryption: 'Шифрование',
    active: 'Активно',
    disabled: 'Выключено',
    language: 'Язык',
    theme: 'Тема',
    visibility: 'Видимость профиля',
    online_status: 'Показывать статус онлайн',
    change_password: 'Сменить пароль',
    current_password: 'Текущий пароль',
    new_password: 'Новый пароль',
    login_history: 'История входов',
    export_data: 'Экспортировать мои данные',
    delete_account: 'Удалить аккаунт',
    danger_zone: 'Опасная зона',
    delete_warning: 'Это действие необратимо и удалит все ваши данные.',
    export_warning: 'Скачайте копию всех ваших постов, сообщений и данных профиля.',
  }
};

type View = 'feed' | 'profile' | 'friends' | 'messages' | 'settings' | 'privacy' | 'security';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState({ username: '', password: '', display_name: '' });
  const [authError, setAuthError] = useState('');
  const [currentView, setCurrentView] = useState<View>('feed');
  
  // Profile state
  const [editProfile, setEditProfile] = useState<UserData | null>(null);
  
  // Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Messages state
  const [activeChat, setActiveChat] = useState<UserData | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Security state
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [pwData, setPwData] = useState({ current: '', new: '' });

  const lang = user?.settings?.language || 'en';
  const t = translations[lang as keyof typeof translations];

  useEffect(() => {
    checkAuth();
    fetchPosts();
  }, []);

  useEffect(() => {
    if (currentView === 'friends') fetchFriends();
    if (currentView === 'messages' && activeChat) fetchMessages(activeChat.id);
    if (currentView === 'security') fetchSecurityHistory();
  }, [currentView, activeChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setEditProfile(data);
      }
    } catch (error) {
      console.error('Auth check failed');
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    const response = await fetch('/api/friends');
    const data = await response.json();
    setFriends(data);
  };

  const fetchMessages = async (otherId: number) => {
    const response = await fetch(`/api/messages/${otherId}`);
    const data = await response.json();
    setChatMessages(data);
  };

  const fetchSecurityHistory = async () => {
    const response = await fetch('/api/security/history');
    const data = await response.json();
    setLoginHistory(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      const data = await response.json();
      if (response.ok) {
        if (authMode === 'login') {
          setUser(data);
          setEditProfile(data);
        } else {
          setAuthMode('login');
          setAuthError('Registration successful! Please login.');
        }
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setAuthError('Network error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setCurrentView('feed');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfile) return;
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProfile),
    });
    if (response.ok) {
      const data = await response.json();
      setUser(data);
      alert('Profile updated securely!');
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (response.ok) {
      const data = await response.json();
      setUser(user ? { ...user, settings: data } : null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/security/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwData.current, newPassword: pwData.new }),
    });
    if (response.ok) {
      alert('Password changed successfully!');
      setPwData({ current: '', new: '' });
    } else {
      const data = await response.json();
      alert(data.error);
    }
  };

  const handleExportData = async () => {
    const response = await fetch('/api/privacy/export');
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `litebook_data_${user?.username}.json`;
    a.click();
  };

  const handleDeleteAccount = async () => {
    if (confirm(t.delete_warning)) {
      const response = await fetch('/api/privacy/delete-account', { method: 'DELETE' });
      if (response.ok) {
        setUser(null);
        setCurrentView('feed');
      }
    }
  };

  const handleSearchUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 1) {
      const response = await fetch(`/api/users/search?q=${q}`);
      const data = await response.json();
      setSearchResults(data);
    } else {
      setSearchResults([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: activeChat.id, content: newMessage }),
    });
    if (response.ok) {
      const msg = await response.json();
      setChatMessages([...chatMessages, msg]);
      setNewMessage('');
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || isPosting || !user) return;

    setIsPosting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost }),
      });
      
      if (response.ok) {
        const post = await response.json();
        setPosts([post, ...posts]);
        setNewPost('');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (response.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Delete failed');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Shield className="text-white w-10 h-10" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">{t.welcome}</h1>
          <p className="text-zinc-500 text-center mb-8 text-sm">{t.privacy_first}</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 ml-1 uppercase font-bold tracking-wider">{t.profile}</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={authData.display_name}
                  onChange={e => setAuthData({...authData, display_name: e.target.value})}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 ml-1 uppercase font-bold tracking-wider">Username</label>
              <input
                type="text"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={authData.username}
                onChange={e => setAuthData({...authData, username: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 ml-1 uppercase font-bold tracking-wider">Password</label>
              <input
                type="password"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={authData.password}
                onChange={e => setAuthData({...authData, password: e.target.value})}
              />
            </div>
            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm text-zinc-400 hover:text-emerald-500 transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800/50 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/20 cursor-pointer" onClick={() => setCurrentView('feed')}>
            <Shield className="text-white w-6 h-6" />
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder={t.search_placeholder} 
              className="bg-zinc-900 border-none rounded-full py-2 pl-10 pr-4 w-64 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-8">
          <NavIcon icon={<Home />} active={currentView === 'feed'} onClick={() => setCurrentView('feed')} />
          <NavIcon icon={<Users />} active={currentView === 'friends'} onClick={() => setCurrentView('friends')} />
          <NavIcon icon={<Mail />} active={currentView === 'messages'} onClick={() => setCurrentView('messages')} />
          <NavIcon icon={<User />} active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 cursor-pointer transition-colors">
            <Bell className="w-5 h-5" />
          </div>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden hover:bg-zinc-700 transition-colors"
          >
            <LogOut className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6">
        {/* Left Sidebar */}
        <div className="hidden lg:block lg:col-span-3 space-y-2">
          <SidebarItem icon={<User className="text-emerald-500" />} label={user.display_name} onClick={() => setCurrentView('profile')} />
          <SidebarItem icon={<Users className="text-blue-500" />} label={t.friends} onClick={() => setCurrentView('friends')} />
          <SidebarItem icon={<Mail className="text-purple-500" />} label={t.messages} onClick={() => setCurrentView('messages')} />
          <SidebarItem icon={<Shield className="text-emerald-500" />} label={t.privacy_center} onClick={() => setCurrentView('privacy')} />
          <SidebarItem icon={<Lock className="text-amber-500" />} label={t.security_checkup} onClick={() => setCurrentView('security')} />
          <hr className="border-zinc-800 my-4" />
          <SidebarItem icon={<Settings />} label={t.settings} onClick={() => setCurrentView('settings')} />
          <SidebarItem icon={<LogOut />} label={t.logout} onClick={handleLogout} />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-6 space-y-6">
          {currentView === 'feed' && (
            <>
              {/* Create Post */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <div className="flex gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-6 h-6 text-zinc-500" />}
                  </div>
                  <form onSubmit={handlePost} className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={`${t.post_placeholder}, ${user.display_name}?`}
                      className="w-full bg-transparent border-none focus:ring-0 text-lg resize-none placeholder-zinc-600 min-h-[80px] outline-none"
                    />
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                      <div className="flex gap-2">
                        <button type="button" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-emerald-500">
                          <Lock className="w-5 h-5" />
                        </button>
                        <span className="text-xs text-zinc-500 flex items-center">{t.encrypted}</span>
                      </div>
                      <button
                        type="submit"
                        disabled={!newPost.trim() || isPosting}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                      >
                        {isPosting ? '...' : t.post_button}
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Posts List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12 text-zinc-500">Loading your secure feed...</div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {posts.map((post) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg"
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                                <User className="w-6 h-6 text-zinc-500" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-zinc-100">{post.display_name}</h3>
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                  {new Date(post.created_at).toLocaleString()} • <Lock className="w-3 h-3" /> Private
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {user.id === post.user_id && (
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="text-zinc-600 hover:text-red-500 p-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <button className="text-zinc-500 hover:text-zinc-300 p-2">
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        </div>
                        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/30">
                          <div className="flex gap-6">
                            <button className="flex items-center gap-2 text-zinc-400 hover:text-emerald-500 transition-colors group">
                              <Heart className="w-5 h-5 group-hover:fill-emerald-500" />
                              <span className="text-sm">Like</span>
                            </button>
                            <button className="flex items-center gap-2 text-zinc-400 hover:text-blue-500 transition-colors">
                              <MessageSquare className="w-5 h-5" />
                              <span className="text-sm">Comment</span>
                            </button>
                          </div>
                          <button className="flex items-center gap-2 text-zinc-400 hover:text-purple-500 transition-colors">
                            <Share2 className="w-5 h-5" />
                            <span className="text-sm">Share</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}

          {currentView === 'profile' && editProfile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="text-emerald-500" /> {t.profile}
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-bold">Display Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editProfile.display_name}
                      onChange={e => setEditProfile({...editProfile, display_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-bold">Gender</label>
                    <select 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editProfile.gender || ''}
                      onChange={e => setEditProfile({...editProfile, gender: e.target.value})}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-bold">Date of Birth</label>
                    <input 
                      type="date" 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editProfile.dob || ''}
                      onChange={e => setEditProfile({...editProfile, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-bold">Avatar URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editProfile.avatar_url || ''}
                      onChange={e => setEditProfile({...editProfile, avatar_url: e.target.value})}
                    />
                  </div>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded-xl font-bold transition-all">
                  {t.save_changes}
                </button>
              </form>
            </motion.div>
          )}

          {currentView === 'settings' && user.settings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="text-emerald-500" /> {t.settings}</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700">
                  <div>
                    <p className="font-bold">{t.language}</p>
                    <p className="text-xs text-zinc-500">Choose your preferred interface language</p>
                  </div>
                  <select 
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 outline-none"
                    value={user.settings.language}
                    onChange={e => handleUpdateSettings({ language: e.target.value as 'en' | 'ru' })}
                  >
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700">
                  <div>
                    <p className="font-bold">{t.theme}</p>
                    <p className="text-xs text-zinc-500">Switch between light and dark mode</p>
                  </div>
                  <select 
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 outline-none"
                    value={user.settings.theme}
                    onChange={e => handleUpdateSettings({ theme: e.target.value as 'light' | 'dark' })}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700">
                  <div>
                    <p className="font-bold">{t.online_status}</p>
                    <p className="text-xs text-zinc-500">Let others see when you are active</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ show_online_status: user.settings?.show_online_status ? 0 : 1 })}
                    className={`w-12 h-6 rounded-full transition-all relative ${user.settings.show_online_status ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.show_online_status ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'privacy' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="text-emerald-500" /> {t.privacy_center}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700 space-y-2">
                  <p className="font-bold">{t.export_data}</p>
                  <p className="text-xs text-zinc-500">{t.export_warning}</p>
                  <button onClick={handleExportData} className="w-full bg-zinc-700 hover:bg-zinc-600 py-2 rounded-lg text-sm transition-all">Download JSON</button>
                </div>
                <div className="p-4 bg-red-900/10 rounded-xl border border-red-900/30 space-y-2">
                  <p className="font-bold text-red-500">{t.danger_zone}</p>
                  <p className="text-xs text-zinc-500">{t.delete_warning}</p>
                  <button onClick={handleDeleteAccount} className="w-full bg-red-600 hover:bg-red-500 py-2 rounded-lg text-sm transition-all text-white">{t.delete_account}</button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold">{t.visibility}</h3>
                <div className="flex gap-2">
                  {['public', 'friends', 'private'].map(v => (
                    <button 
                      key={v}
                      onClick={() => handleUpdateSettings({ profile_visibility: v as any })}
                      className={`flex-1 py-2 rounded-lg border transition-all capitalize text-sm ${user.settings?.profile_visibility === v ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-2"><Lock className="text-amber-500" /> {t.security_checkup}</h2>
              
              <div className="space-y-4">
                <h3 className="font-bold">{t.change_password}</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input 
                    type="password" 
                    placeholder={t.current_password}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={pwData.current}
                    onChange={e => setPwData({...pwData, current: e.target.value})}
                  />
                  <input 
                    type="password" 
                    placeholder={t.new_password}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={pwData.new}
                    onChange={e => setPwData({...pwData, new: e.target.value})}
                  />
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">
                    {t.save_changes}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold">{t.login_history}</h3>
                <div className="space-y-2">
                  {loginHistory.map(h => (
                    <div key={h.id} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{h.ip_address}</p>
                        <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{h.user_agent}</p>
                      </div>
                      <p className="text-[10px] text-zinc-400">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'friends' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="text-emerald-500" /> {t.find_friends}
                </h2>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder={t.search_placeholder} 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={searchQuery}
                    onChange={handleSearchUsers}
                  />
                </div>
                <div className="space-y-2">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="text-zinc-500" />}
                        </div>
                        <div>
                          <p className="font-bold">{u.display_name}</p>
                          <p className="text-xs text-zinc-500">@{u.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          await fetch('/api/friends/request', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ friend_id: u.id })
                          });
                          alert('Request sent!');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded-lg text-white transition-all"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">{t.your_friends}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(f => (
                    <div key={f.id} className="p-4 bg-zinc-800/30 border border-zinc-700 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="text-zinc-500" />}
                        </div>
                        <div>
                          <p className="font-bold">{f.display_name}</p>
                          <p className="text-xs text-zinc-500">{f.status === 'accepted' ? t.friends : 'Pending Request'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {f.status === 'pending' && (
                          <button 
                            onClick={async () => {
                              await fetch('/api/friends/accept', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ friend_id: f.id })
                              });
                              fetchFriends();
                            }}
                            className="bg-emerald-600 p-2 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setActiveChat(f);
                            setCurrentView('messages');
                          }}
                          className="bg-zinc-700 p-2 rounded-lg hover:bg-zinc-600"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'messages' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[600px] bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/80">
                {activeChat ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {activeChat.avatar_url ? <img src={activeChat.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="text-zinc-500" />}
                    </div>
                    <div>
                      <h3 className="font-bold">{activeChat.display_name}</h3>
                      <p className="text-xs text-emerald-500 flex items-center gap-1"><Shield className="w-3 h-3" /> {t.secure_chat}</p>
                    </div>
                  </>
                ) : (
                  <h3 className="font-bold">Select a friend to message</h3>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${m.sender_id === user.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-100 rounded-tl-none'}`}>
                      <p className="text-sm">{m.content}</p>
                      <p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {activeChat && (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex gap-2">
                  <input 
                    type="text" 
                    placeholder={t.type_message}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button className="bg-emerald-600 p-3 rounded-xl hover:bg-emerald-500 transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block xl:col-span-3 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              {t.privacy_insights}
            </h3>
            <div className="space-y-4">
              <PrivacyStat label={t.data_collected} value="0%" color="text-emerald-500" />
              <PrivacyStat label={t.ad_tracking} value={t.disabled} color="text-emerald-500" />
              <PrivacyStat label={t.encryption} value={t.active} color="text-emerald-500" />
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold mb-4">{t.your_friends}</h3>
            <div className="space-y-3">
              {friends.filter(f => f.status === 'accepted').slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800 p-2 rounded-lg transition-colors" onClick={() => { setActiveChat(f); setCurrentView('messages'); }}>
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                    {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <span className="text-sm font-medium">{f.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavIcon({ icon, active = false, onClick }: { icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-3 md:px-8 cursor-pointer transition-all relative group ${active ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
      {!active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-full" />}
    </div>
  );
}

function SidebarItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl cursor-pointer transition-colors group"
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{label}</span>
    </div>
  );
}

function PrivacyStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
