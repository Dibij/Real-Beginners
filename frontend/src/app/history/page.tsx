'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { History, Activity, Plus, CheckCircle, Clock, ChevronRight, MessageSquare, Info } from 'lucide-react';
import NoteDetailModal from '@/components/NoteDetailModal';

interface HistoryEvent {
    id: number;
    note: number | null;
    action_item_content: string;
    item_type: string;
    action_type: string;
    details: string;
    reasoning: string | null;
    created_at: string;
}

export default function HistoryPage() {
    const { user, loading } = useAuth();
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            fetchHistory();
        }
    }, [user, loading]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('action-items/history/');
            setHistory(res.data.results || res.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Grouping events by action_item_content (The "Topic")
    const groupedHistory = history.reduce((groups: { [key: string]: HistoryEvent[] }, event) => {
        const topic = event.action_item_content;
        if (!groups[topic]) groups[topic] = [];
        groups[topic].push(event);
        return groups;
    }, {});

    if (loading || isLoading) return <div className="flex h-screen items-center justify-center">Loading History...</div>;

    return (
        <div className="flex bg-zinc-50 dark:bg-black min-h-screen">
            <Sidebar onNewNote={() => { }} />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-xl">
                            <History className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black dark:text-white tracking-tight">Smart Insights History</h1>
                    </div>
                    <p className="text-zinc-500 font-medium">An in-depth timeline of how your tasks and reminders evolved with AI.</p>
                </header>

                <div className="max-w-4xl space-y-12">
                    {Object.keys(groupedHistory).length > 0 ? (
                        Object.entries(groupedHistory).map(([topic, events]) => (
                            <section key={topic} className="relative">
                                {/* Topic Header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px flex-1 bg-zinc-200 dark:border-zinc-800" />
                                    <h2 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em]">{topic}</h2>
                                    <div className="h-px flex-1 bg-zinc-200 dark:border-zinc-800" />
                                </div>

                                <div className="space-y-6">
                                    {events.map((event, idx) => (
                                        <div
                                            key={event.id}
                                            onClick={() => event.note && setSelectedNoteId(event.note)}
                                            className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl transition-all ${event.note ? 'cursor-pointer hover:border-blue-500 hover:shadow-xl group' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${event.action_type === 'Added by AI' ? 'bg-purple-500/10 text-purple-500' :
                                                            event.action_type === 'Manually Added' ? 'bg-blue-500/10 text-blue-500' :
                                                                'bg-emerald-500/10 text-emerald-500'
                                                        }`}>
                                                        {event.action_type === 'Added by AI' && <Activity className="w-5 h-5" />}
                                                        {event.action_type === 'Manually Added' && <Plus className="w-5 h-5" />}
                                                        {event.action_type === 'Status Changed' && <CheckCircle className="w-5 h-5" />}
                                                        {event.action_type === 'Modified' && <Info className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black uppercase tracking-wider text-zinc-400 block">{event.action_type}</span>
                                                        <span className="text-[10px] font-bold text-zinc-500">{new Date(event.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                {event.note && (
                                                    <div className="flex items-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black uppercase">View Source Note</span>
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-zinc-900 dark:text-zinc-100 font-bold text-lg">
                                                    {event.action_item_content}
                                                </p>
                                                {event.reasoning && (
                                                    <div className="flex gap-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-l-4 border-blue-600">
                                                        <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                                                            "{event.reasoning}"
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                                                    <Info className="w-3.5 h-3.5" />
                                                    <span>{event.details}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="text-center py-20 text-zinc-500">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-xl font-bold">No history found</p>
                            <p>Your AI interactions will be logged here in detail.</p>
                        </div>
                    )}
                </div>
            </main>

            <NoteDetailModal
                noteId={selectedNoteId}
                onClose={() => setSelectedNoteId(null)}
                onRefresh={fetchHistory}
            />
        </div>
    );
}
