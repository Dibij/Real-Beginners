'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/utils/api';
import { Search as SearchIcon, Clock, Tag as TagIcon } from 'lucide-react';
import CreateNoteModal from '@/components/CreateNoteModal';

interface Note {
    id: number;
    title: string;
    content: string;
    priority: string;
    created_at: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Note[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSearch = async () => {
        try {
            const res = await api.get(`notes/?search=${query}`);
            setResults(res.data.results || res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex bg-zinc-50 dark:bg-black min-h-screen">
            <Sidebar onNewNote={() => setIsModalOpen(true)} />
            <main className="flex-1 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold dark:text-white mb-4">Search Notes</h1>
                    <div className="relative max-w-2xl">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by title, content or tags..."
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-lg transition-all"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((note) => (
                        <div key={note.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow cursor-pointer">
                            <h3 className="text-xl font-bold dark:text-white mb-2">{note.title || 'Untitled Note'}</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-4">{note.content}</p>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(note.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {query && results.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-500">
                            No notes found for "{query}"
                        </div>
                    )}
                </div>

                <CreateNoteModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onRefresh={handleSearch}
                />
            </main>
        </div>
    );
}
