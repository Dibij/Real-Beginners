'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
<<<<<<< HEAD
import SettingsModal from '@/components/SettingsModal';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Mic, FileText, CheckCircle, Bell, Tag as TagIcon, Plus, Search, Settings, Globe, ExternalLink, History, LogOut, Calendar, Activity, Info } from 'lucide-react';
=======
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Mic, Clock, Tag as TagIcon, ChevronRight, Plus, Search, LogIn, CheckCircle, Circle, Package, History, Activity, Bell, LogOut, Settings, User as UserIcon, Globe, ExternalLink } from 'lucide-react';
>>>>>>> aec1213707377283edd6536d97913adf4a24fa14
import CreateNoteModal from '@/components/CreateNoteModal';
import NoteDetailModal from '@/components/NoteDetailModal';

interface Note {
    id: number;
    title: string;
    content: string;
    summary: string | null;
    priority: string;
    audios: {
        id: number;
        audio_file: string;
        created_at: string;
    }[];
    created_at: string;
}


export default function Dashboard() {
    return (
        <Suspense fallback={<div>Loading Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const [notes, setNotes] = useState<Note[]>([]);
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Renamed isModalOpen
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSmartCategory, setSelectedSmartCategory] = useState<string | null>(null);
    const [notesLoading, setNotesLoading] = useState(true);
    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [actionItems, setActionItems] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [notesSearchQuery, setNotesSearchQuery] = useState('');
    // Removed local webSearchResults state as it's handled in the component
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingNoteId, setProcessingNoteId] = useState<number | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Header State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
<<<<<<< HEAD
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
=======
>>>>>>> aec1213707377283edd6536d97913adf4a24fa14
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { logout } = useAuth();

    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type');
    const catParam = searchParams.get('category');

    useEffect(() => {
        if (typeParam) {
            setSelectedSmartCategory(typeParam);
            setSelectedCategoryId(null);
        } else if (catParam) {
            setSelectedCategoryId(Number(catParam));
            setSelectedSmartCategory(null);
        } else {
            // Default to My Notes if no params
            setSelectedSmartCategory(null);
            setSelectedCategoryId(null);
        }
    }, [typeParam, catParam]);

    useEffect(() => {
        if (!loading) {
            const token = localStorage.getItem('access_token');
            if (token && user) {
                if (selectedSmartCategory) {
                    fetchActionItems(selectedSmartCategory);
                    fetchHistory();
                } else {
                    fetchNotes(selectedCategoryId);
                    // fetchWebResults(); // Removed, handled by component
                    fetchHistory();
                }
            } else {
                setNotesLoading(false);
            }
        }
    }, [user, loading, selectedCategoryId, selectedSmartCategory]);

    // Notification Logic
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('notifications/');
            setNotifications(res.data.results || res.data || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await api.patch(`notifications/${id}/read/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const fetchNotes = async (catId: number | null = null, search: string = '') => {
        setNotesLoading(true);
        try {
            let url = 'notes/';
            const params = new URLSearchParams();
            if (catId) params.append('category', catId.toString());
            if (search) params.append('notessearch', search);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await api.get(url);
            setNotes(res.data.results || res.data);
            setActionItems([]); // Clear action items when fetching notes
        } catch (err: any) {
            console.error('Failed to fetch notes:', err);
        } finally {
            setNotesLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('action-items/history/');
            setHistory(res.data.results || res.data);
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
        }
    };

    // Poll for note processing status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (processingNoteId && isProcessing) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`notes/${processingNoteId}/`);
                    const note = res.data;

                    // Check if processing is complete (summary updated)
                    if (note.summary && note.summary !== 'Processing...') {
                        setIsProcessing(false);
                        setProcessingNoteId(null);
                        // Refresh notes to show the new content
                        fetchNotes(selectedCategoryId);
                    }
                } catch (err) {
                    console.error('Error polling note status:', err);
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [processingNoteId, isProcessing, selectedCategoryId]);



    const fetchActionItems = async (type: string) => {
        setNotesLoading(true);
        try {
            // Support Todo/Task merge
            const queryType = type.toLowerCase() === 'todo' ? 'Task' : type;
            const res = await api.get(`action-items/?type=${queryType}&status=Pending`);
            setActionItems(res.data.results || res.data);
            setNotes([]); // Clear notes when fetching action items
        } catch (err: any) {
            console.error('Failed to fetch action items:', err);
        } finally {
            setNotesLoading(false);
        }
    };

    const toggleActionItemStatus = async (itemId: number, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
            await api.patch(`action-items/${itemId}/`, { status: newStatus });
            if (selectedSmartCategory) {
                fetchActionItems(selectedSmartCategory);
                fetchHistory();
            }
        } catch (err) {
            console.error('Failed to update action item:', err);
        }
    };

    const createManualActionItem = async (content: string) => {
        if (!selectedSmartCategory || !content) return;
        try {
            // Find a dummy note or the latest note to link to? 
            // Or just allow null note if the backend supports it.
            // For now, let's just use the first available note or error.
            const noteRes = await api.get('notes/');
            const lastNote = noteRes.data.results[0] || noteRes.data[0];
            if (!lastNote) {
                alert("Please create at least one voice note first to link manual tasks.");
                return;
            }

            await api.post('action-items/', {
                note: lastNote.id,
                item_type: selectedSmartCategory,
                content: content,
                status: 'Pending'
            });
            fetchActionItems(selectedSmartCategory);
            fetchHistory();
        } catch (err) {
            console.error('Failed to create action item:', err);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    // If not loading and no user, show a login prompt
    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Welcome!</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-6">Please log in to view your notes.</p>
                    <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-zinc-50 dark:bg-black min-h-screen">
            <Sidebar
                onNewNote={() => setIsCreateModalOpen(true)}
                onCategorySelect={(id) => {
                    setSelectedCategoryId(id);
                    setSelectedSmartCategory(null);
                }}
                selectedCategoryId={selectedCategoryId}
                onSmartCategorySelect={(type) => {
                    setSelectedSmartCategory(type);
                    setSelectedCategoryId(null);
                }}
                selectedSmartCategory={selectedSmartCategory}
            />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <header className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black dark:text-white tracking-tight">
                            {selectedSmartCategory ? `${selectedSmartCategory}s` : 'My Notes'}
                        </h1>
                        <p className="text-zinc-500 font-medium mt-1">
                            {selectedSmartCategory ? `AI-extracted entries from your voice notes` : `Capture and organize your thoughts with AI.`}
                        </p>
                        {selectedSmartCategory && (
                            <button
                                onClick={() => {
                                    const content = prompt(`Enter new ${selectedSmartCategory.toLowerCase()}:`);
                                    if (content) createManualActionItem(content);
                                }}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add {selectedSmartCategory}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={notesSearchQuery}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setNotesSearchQuery(value);
                                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                    searchTimeoutRef.current = setTimeout(() => {
                                        fetchNotes(selectedCategoryId, value);
                                    }, 300);
                                }}
                                className="pl-9 pr-4 py-2.5 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:w-72 transition-all shadow-sm"
                            />
                        </div>

                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setIsNotificationOpen(!isNotificationOpen);
                                    setIsProfileOpen(false);
                                }}
                                className="p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm relative"
                            >
                                <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-zinc-800" />
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notifications</h4>
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{notifications.length} New</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Bell className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                                                <p className="text-zinc-400 text-sm">No new notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className="p-4 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors relative group"
                                                    onClick={() => {
                                                        if (notification.link) router.push(notification.link);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate pr-4">{notification.title}</h5>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(notification.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"
                                                            title="Mark as read"
                                                        >
                                                            <CheckCircle className="w-4 h-4 text-zinc-400 hover:text-blue-500" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">{notification.message}</p>
                                                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600 font-medium">
                                                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setIsProfileOpen(!isProfileOpen);
                                    setIsNotificationOpen(false);
                                }}
                                className="flex items-center gap-3 pl-1 pr-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none mb-0.5">{user?.username || 'User'}</p>
                                    <p className="text-[10px] text-zinc-500 font-medium leading-none">Pro Plan</p>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${isProfileOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1">
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                        <UserIcon className="w-4 h-4" />
                                        <span>Profile</span>
                                    </button>
<<<<<<< HEAD
                                    <button
                                        onClick={() => {
                                            setIsSettingsOpen(true);
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
=======
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
>>>>>>> aec1213707377283edd6536d97913adf4a24fa14
                                        <Settings className="w-4 h-4" />
                                        <span>Settings</span>
                                    </button>
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Log Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex gap-8">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 align-top h-fit">
                        {notesLoading ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="text-zinc-400 font-medium animate-pulse">Loading...</p>
                            </div>
                        ) : selectedSmartCategory ? (
                            actionItems.length > 0 ? (
                                actionItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 hover:shadow-xl transition-all group h-fit"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-2xl ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'} dark:bg-zinc-800 transition-colors`}>
                                                {selectedSmartCategory === 'Task' && <CheckCircle className="w-6 h-6" />}
                                                {selectedSmartCategory === 'Reminder' && <Bell className="w-6 h-6" />}
                                                {selectedSmartCategory === 'Shopping' && <TagIcon className="w-6 h-6" />}
<<<<<<< HEAD
                                                {selectedSmartCategory === 'StudyNote' && <FileText className="w-6 h-6" />}
                                                {selectedSmartCategory === 'Habit' && <Activity className="w-6 h-6 text-orange-500" />}
=======
                                                {selectedSmartCategory === 'Fact' && <Activity className="w-6 h-6" />}
>>>>>>> aec1213707377283edd6536d97913adf4a24fa14
                                            </div>
                                            <button
                                                onClick={() => toggleActionItemStatus(item.id, item.status)}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${item.status === 'Completed'
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-zinc-100 text-zinc-500 hover:bg-emerald-500 hover:text-white'
                                                    }`}
                                            >
                                                {item.status}
                                            </button>
                                        </div>
<<<<<<< HEAD
                                        <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                            {item.content}
                                        </h4>

                                        {item.ai_feedback && (
                                            <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                                                <div className="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
                                                    <Info className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">AI Coach Insight</span>
                                                </div>
                                                <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                                                    "{item.ai_feedback}"
                                                </p>
                                            </div>
                                        )}
=======
                                        <h3 className={`text-lg font-bold dark:text-white mb-4 ${item.status === 'Completed' ? 'line-through opacity-50' : ''}`}>
                                            {item.content}
                                        </h3>
>>>>>>> aec1213707377283edd6536d97913adf4a24fa14
                                        {item.note && (
                                            <div
                                                onClick={() => setSelectedNoteId(item.note)}
                                                className="pt-4 border-t border-zinc-50 dark:border-zinc-800 flex items-center gap-2 text-xs text-zinc-400 font-bold uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors"
                                            >
                                                <Mic className="w-3.5 h-3.5" />
                                                <span>View Source Note</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-12 flex flex-col items-center justify-center text-zinc-400">
                                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle className="w-10 h-10 opacity-50" />
                                    </div>
                                    <span className="font-bold text-xl">No pending {selectedSmartCategory}s</span>
                                    <p className="text-sm mt-2 opacity-60 font-medium tracking-wide">Great job! You're all caught up.</p>
                                </div>
                            )
                        ) : notes.length > 0 ? (
                            notes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNoteId(note.id)}
                                    className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group h-fit"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 group-hover:text-blue-600 transition-colors">
                                            <Mic className="w-6 h-6" />
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${note.priority === 'high' ? 'bg-red-500 text-white' :
                                            note.priority === 'medium' ? 'bg-yellow-500 text-white' :
                                                'bg-emerald-500 text-white'
                                            }`}>
                                            {note.priority}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold dark:text-white mb-2 line-clamp-1">{note.title || 'Untitled note'}</h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-3 mb-4 flex-1">
                                        {note.summary || 'No summary available...'}
                                    </p>
                                    <div className="pt-4 border-t border-zinc-50 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-400 font-bold uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="col-span-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-12 flex flex-col items-center justify-center text-zinc-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                            >
                                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                                    <Mic className="w-10 h-10" />
                                </div>
                                <span className="font-bold text-xl">Create your first voice note</span>
                                <p className="text-sm mt-2 opacity-60 font-medium tracking-wide">AI will automatically organize it for you.</p>
                            </button>
                        )}
                    </div>

                    {/* Right Sidebar for standard view (History) */}
                    <aside className="w-80 space-y-8 h-fit sticky top-8 hidden xl:block">

                        {/* History */}
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <History className="w-5 h-5 text-blue-600" />
                                <h2 className="font-black dark:text-white uppercase tracking-tight text-sm">Recent Activity</h2>
                            </div>
                            <div className="space-y-6">
                                {history.length > 0 ? (
                                    history.slice(0, 5).map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={() => event.note && setSelectedNoteId(event.note)}
                                            className={`relative pl-6 border-l-2 border-zinc-100 dark:border-zinc-800 pb-1 ${event.note ? 'cursor-pointer hover:border-blue-500 group/item' : ''}`}
                                        >
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-black border-2 border-blue-600 shadow-sm flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                            </div>
                                            <p className="text-xs font-black dark:text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                {event.action_type}
                                            </p>
                                            <p className="text-sm text-zinc-900 dark:text-zinc-300 font-medium line-clamp-2 group-hover/item:text-blue-600 transition-colors">
                                                {event.action_item_content}
                                            </p>
                                            <span className="text-[10px] text-zinc-400 font-bold block mt-1">
                                                {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-zinc-400 text-xs font-medium italic">No activity recorded yet...</p>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <CreateNoteModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onRefresh={() => fetchNotes(selectedCategoryId)}
                onProcessing={(processing, noteId) => {
                    setIsProcessing(processing);
                    if (noteId) setProcessingNoteId(noteId);
                }}
            />
            <NoteDetailModal
                noteId={selectedNoteId}
                onClose={() => setSelectedNoteId(null)}
                onRefresh={() => fetchNotes(selectedCategoryId)}
            />

<<<<<<< HEAD
            {/* Voice Transcription Indicator */}
            {isProcessing && (
                <div className="fixed bottom-6 right-6 flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-6 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 duration-500 z-50">
                    <div className="flex gap-1.5 h-6 items-center">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="w-1 bg-blue-500 rounded-full animate-pulse transition-all duration-300" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                            Listening <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">AI Transcription...</span>
                    </div>
                </div>
            )}

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
=======
            {/* Processing Toast */}
            {isProcessing && (
                <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
                    <div className="relative">
                        <div className="w-10 h-10 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        <Globe className="w-5 h-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                        <p className="font-bold text-sm dark:text-white">AI Agent Active</p>
                        <p className="text-xs text-zinc-500">Transcribing, Researching & Summarizing...</p>
                    </div>
                </div>
            )}
>>>>>>> aec1213707377283edd6536d97913adf4a24fa14
        </div>
    );
}
