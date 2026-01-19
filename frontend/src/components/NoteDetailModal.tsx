'use client';

import React, { useState, useEffect } from 'react';
import { X, Mic, Save, Loader2, Play, Pause, Trash2, Clock, Tag as TagIcon, ChevronRight } from 'lucide-react';
import api from '@/utils/api';

interface Note {
    id: number;
    title: string;
    content: string;
    summary: string | null;
    priority: string;
    category: {
        id: number;
        name: string;
        color: string;
    } | null;
    audios: {
        id: number;
        audio_file: string;
        created_at: string;
    }[];
    created_at: string;
}

interface NoteDetailModalProps {
    noteId: number | null;
    onClose: () => void;
    onRefresh: () => void;
}

export default function NoteDetailModal({ noteId, onClose, onRefresh }: NoteDetailModalProps) {
    const [note, setNote] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (noteId) {
            fetchNote();
        }
    }, [noteId]);

    const fetchNote = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`notes/${noteId}/`);
            setNote(res.data);
            setTitle(res.data.title || '');
            setContent(res.data.content || '');
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await api.patch(`notes/${noteId}/`, { title, content });
            onRefresh();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this note?')) return;
        try {
            await api.delete(`notes/${noteId}/`);
            onRefresh();
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    const togglePlayback = (index: number) => {
        const audio = document.getElementById(`detail-audio-${index}`) as HTMLAudioElement;
        if (!audio) return;

        if (playingIndex === index) {
            audio.pause();
            setPlayingIndex(null);
        } else {
            if (playingIndex !== null) {
                const prev = document.getElementById(`detail-audio-${playingIndex}`) as HTMLAudioElement;
                if (prev) prev.pause();
            }
            audio.play();
            setPlayingIndex(index);
        }
    };

    if (!noteId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                {isLoading ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    </div>
                ) : note ? (
                    <>
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold dark:text-white">Note Details</h2>
                                {note.category && (
                                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                                        {note.category.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDelete}
                                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    <X className="w-6 h-6 dark:text-zinc-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh]">
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    className="w-full text-3xl font-bold bg-transparent outline-none dark:text-white border-b border-transparent focus:border-blue-500/30 pb-2 transition-all"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Untitled Note"
                                />

                                <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Created: {new Date(note.created_at).toLocaleString()}
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-md uppercase font-bold text-[10px] ${note.priority === 'high' ? 'bg-red-100 text-red-600' :
                                        note.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-green-100 text-green-600'
                                        }`}>
                                        {note.priority} Priority
                                    </div>
                                </div>
                            </div>

                            {note.summary && (
                                <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        AI Summary
                                    </h4>
                                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed italic">"{note.summary}"</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Content</h4>
                                <textarea
                                    className="w-full h-48 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 rounded-2xl outline-none dark:text-white resize-none text-lg leading-relaxed border border-zinc-100 dark:border-zinc-800 focus:border-blue-500/30 transition-all"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="No content..."
                                />
                            </div>

                            {note.audios.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Voice Transcripts & Recordings</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {note.audios.map((audio, index) => (
                                            <div key={audio.id} className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm group/audio">
                                                <button
                                                    onClick={() => togglePlayback(index)}
                                                    className="p-3.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                                                >
                                                    {playingIndex === index ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                                </button>
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-zinc-400">Recording #{index + 1}</span>
                                                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className={`h-full bg-blue-500 transition-all duration-300 ${playingIndex === index ? 'w-full' : 'w-0'}`} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm('Delete this recording?')) return;
                                                            try {
                                                                await api.delete(`notes/audio/${audio.id}/`);
                                                                setNote(prev => prev ? {
                                                                    ...prev,
                                                                    audios: prev.audios.filter(a => a.id !== audio.id)
                                                                } : null);
                                                                onRefresh();
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }}
                                                        className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover/audio:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <audio
                                                        id={`detail-audio-${index}`}
                                                        src={audio.audio_file.startsWith('http') ? audio.audio_file : `http://localhost:8000${audio.audio_file}`}
                                                        onEnded={() => setPlayingIndex(null)}
                                                        className="hidden"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
                            <button
                                onClick={handleUpdate}
                                disabled={isSaving}
                                className="w-full py-4 px-6 rounded-2xl bg-zinc-900 dark:bg-white dark:text-black text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl"
                            >
                                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                Update Changes
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-20 text-center">Note not found.</div>
                )}
            </div>
        </div>
    );
}
