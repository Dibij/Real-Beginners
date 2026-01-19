'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/utils/api';
import { Globe, Search, ExternalLink, Calendar, ChevronLeft, ChevronRight, ArrowUpRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
    id: number;
    query: string;
    note: number | null;
    created_at: string;
    results: { title: string; url: string; snippet: string }[];
    summary: string;
}

export default function SearchHistoryPage() {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        fetchResults(page);
    }, [page]);

    const fetchResults = async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await api.get(`web-search-results/?page=${pageNum}`);
            setResults(res.data.results);
            setTotalPages(Math.ceil(res.data.count / 10));
            // Auto-expand first result if strictly viewing page 1 and it's fresh? optional.
        } catch (err) {
            console.error('Failed to fetch search history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-zinc-50 dark:bg-black min-h-screen">
            <Sidebar />

            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <header className="mb-10">
                    <h1 className="text-4xl font-black dark:text-white tracking-tight flex items-center gap-3">
                        <Globe className="w-10 h-10 text-purple-600" />
                        Web Search History
                    </h1>
                    <p className="text-zinc-500 font-medium mt-2 max-w-2xl">
                        Deep dive into your past inquiries. Each search includes AI-synthesized summaries drawn from the top web sources.
                    </p>
                </header>

                <div className="space-y-6 max-w-5xl">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-zinc-400 font-medium">Retrieving deep insights...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((item) => (
                            <div
                                key={item.id}
                                className={`group bg-white dark:bg-zinc-900 rounded-3xl border transition-all duration-300 overflow-hidden ${expandedId === item.id
                                    ? 'border-purple-500 shadow-xl shadow-purple-500/10'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-lg'
                                    }`}
                            >
                                {/* Header / Summary Card */}
                                <div
                                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    className="p-6 cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl ${expandedId === item.id ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'} transition-colors`}>
                                                <Search className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold dark:text-white capitalize leading-tight">
                                                    {item.query}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{item.results?.length || 0} Sources Analyzed</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-6 h-6 text-zinc-300 transition-transform duration-300 ${expandedId === item.id ? 'rotate-90 text-purple-500' : ''}`} />
                                    </div>

                                    {/* AI Summary Preview */}
                                    <div className="relative pl-6 border-l-4 border-purple-100 dark:border-purple-900/30">
                                        <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">AI Summary</h4>
                                        <p className={`text-zinc-600 dark:text-zinc-300 leading-relaxed ${expandedId === item.id ? '' : 'line-clamp-2'}`}>
                                            {item.summary || <span className="italic opacity-50">Processing summary...</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <div className={`grid transition-all duration-500 ease-in-out ${expandedId === item.id ? 'grid-rows-[1fr] opacity-100 border-t border-zinc-100 dark:border-zinc-800' : 'grid-rows-[0fr] opacity-0'
                                    }`}>
                                    <div className="overflow-hidden">
                                        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/30">
                                            <h4 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <BookOpen className="w-4 h-4" />
                                                Source Content
                                            </h4>

                                            <div className="grid grid-cols-1 gap-6">
                                                {item.results?.slice(0, 5).map((source: any, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={source.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-700 hover:shadow-lg transition-all group/card relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 opacity-0 group-hover/card:opacity-100 transition-opacity" />

                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <h5 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 group-hover/card:text-purple-600 transition-colors">
                                                                {source.title}
                                                            </h5>
                                                            <ArrowUpRight className="w-5 h-5 text-zinc-300 group-hover/card:text-purple-500 shrink-0" />
                                                        </div>

                                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800">
                                                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                                                                {source.content || source.snippet}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-wider">
                                                            <Globe className="w-3.5 h-3.5" />
                                                            {new URL(source.url).hostname.replace('www.', '')}
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>

                                            {item.note && (
                                                <div className="mt-6 flex justify-end">
                                                    <Link
                                                        href={`/dashboard?noteId=${item.note}`}
                                                        className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2"
                                                    >
                                                        View Related Note <ArrowUpRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                            <Search className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-zinc-400">No search history</h3>
                            <p className="text-zinc-500 max-w-sm mx-auto mt-2">
                                When you mention "search for..." in your voice notes, the AI will research and archive the results here.
                            </p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-12 max-w-5xl">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
