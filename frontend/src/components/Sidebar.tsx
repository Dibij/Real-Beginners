'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Mic, FileText, Settings, Plus, Tag, ShoppingBag, Info, History, Globe, ExternalLink, Bell, CheckCircle } from 'lucide-react';

interface SidebarProps {
    onNewNote?: () => void;
    onCategorySelect?: (categoryId: number | null) => void;
    selectedCategoryId?: number | null;
    onSmartCategorySelect?: (type: string | null) => void;
    selectedSmartCategory?: string | null;
    isProcessing?: boolean;
}

export default function Sidebar({
    onNewNote,
    onCategorySelect,
    selectedCategoryId,
    onSmartCategorySelect,
    selectedSmartCategory
}: SidebarProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [categories, setCategories] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (user) {
            fetchCategories();
        }
    }, [user]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('categories/');
            setCategories(res.data.results || res.data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };



    const handleNewNote = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        onNewNote?.();
    };

    return (
        <div className="w-64 h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-4 sticky top-0 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 px-2 mb-8 cursor-pointer">
                <div onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
                    <Mic className="w-8 h-8 text-blue-600" />
                    <span className="text-xl font-bold dark:text-white">VoiceNotes</span>
                </div>

            </div>

            <button
                onClick={handleNewNote}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl mb-6 transition-colors shadow-lg shadow-blue-500/20"
            >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">New Note</span>
            </button>

            <nav className="flex-1 space-y-6">
                <div>
                    <h3 className="px-3 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Main</h3>
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                onCategorySelect?.(null);
                                onSmartCategorySelect?.(null);
                                router.push('/dashboard');
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${!selectedCategoryId && !selectedSmartCategory ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            <FileText className="w-5 h-5" />
                            <span>My Notes</span>
                        </button>
                        <button
                            onClick={() => router.push('/history')}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <History className="w-5 h-5" />
                            <span>History</span>
                        </button>
                        <button
                            onClick={() => router.push('/search-history')}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <Globe className="w-5 h-5" />
                            <span>Web Search</span>
                        </button>

                        <button
                            onClick={() => router.push('/clock')}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            <span>Clock & Alarms</span>
                        </button>
                        <button
                            onClick={() => router.push('/calendar')}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <Calendar className="w-5 h-5" />
                            <span>Calendar</span>
                        </button>
                    </div>
                </div>
                <div>
                    <h3 className="px-3 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Health & Growth</h3>
                    <div className="px-2">
                        <button
                            onClick={() => router.push('/dashboard?type=Habit')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedSmartCategory === 'Habit' ? 'text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/10' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            <Activity className="w-5 h-5" />
                            <span>Habit Tracker</span>
                        </button>
                    </div>
                </div>


                    </div>
                </div>


                <div>
                    <h3 className="px-3 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Smart Insights</h3>
                    <div className="space-y-1">
                        {[
                            { name: 'Tasks', type: 'Task', icon: CheckCircle },
                            { name: 'Reminders', type: 'Reminder', icon: Bell },
                            { name: 'Shopping', type: 'Shopping', icon: ShoppingBag },
                            { name: 'Facts', type: 'Fact', icon: Info },
                        ].map((item) => (
                            <button
                                key={item.type}
                                onClick={() => {
                                    onCategorySelect?.(null);
                                    onSmartCategorySelect?.(item.type);
                                    router.push(`/dashboard?type=${item.type}`);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedSmartCategory === item.type ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </div>
                </div>


                {categories.length > 0 && (
                    <div>
                        <h3 className="px-3 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Categories</h3>
                        <div className="space-y-1">
                            {categories
                                .filter(cat => !['Todo', 'Shopping', 'Reminder', 'Idea'].includes(cat.name))
                                .map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            onSmartCategorySelect?.(null);
                                            onCategorySelect?.(cat.id);
                                            router.push(`/dashboard?category=${cat.id}`);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedCategoryId === cat.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                    >
                                        <Tag className="w-4 h-4" />
                                        <span className="truncate">{cat.name}</span>
                                    </button>
                                ))}
                        </div>
                    </div>
                )}

            </nav>

        </div>
    );
}
