'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Globe as GoogleIcon, CheckCircle, RefreshCcw, Plus, Trash2, MapPin, Clock, ExternalLink, ArrowLeft } from 'lucide-react';
import api from '@/utils/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function CalendarPage() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSynced, setIsSynced] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [googleEvents, setGoogleEvents] = useState<any[]>([]);
    const [googleLoading, setGoogleLoading] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        fetchMeetings();
        checkSyncStatus();

        if (searchParams.get('sync') === 'success') {
            setIsSynced(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isSynced) {
            fetchGoogleEvents();
        }
    }, [isSynced]);

    const fetchMeetings = async () => {
        try {
            const res = await api.get('action-items/', { params: { type: 'Meeting' } });
            setMeetings(res.data.results || res.data);
        } catch (err) {
            console.error('Failed to fetch meetings', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGoogleEvents = async () => {
        setGoogleLoading(true);
        try {
            const res = await api.get('google/events/');
            setGoogleEvents(res.data.results || res.data);
        } catch (err) {
            console.error('Failed to fetch Google events', err);
        } finally {
            setGoogleLoading(false);
        }
    };

    const checkSyncStatus = async () => {
        try {
            const res = await api.get('google/status/');
            setIsSynced(res.data.is_connected);
        } catch (err) { }
    };

    const handleConnect = async () => {
        setSyncLoading(true);
        try {
            const res = await api.get('google/auth/');
            if (res.data.authorization_url) {
                window.location.href = res.data.authorization_url;
            }
        } catch (err) {
            console.error('Failed to get auth URL', err);
            alert('Failed to connect to Google. Check if redirect URIs are configured correctly.');
        } finally {
            setSyncLoading(false);
        }
    };

    const deleteMeeting = async (id: number) => {
        if (!confirm('Are you sure you want to delete this meeting?')) return;
        try {
            await api.delete(`action-items/${id}/`);
            setMeetings(meetings.filter(m => m.id !== id));
        } catch (err) {
            console.error('Failed to delete meeting', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-6xl mx-auto space-y-12">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 font-bold transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </button>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                <CalendarIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black dark:text-white tracking-tight">Calendar Sync</h1>
                                <p className="text-zinc-500 font-medium">Manage your meetings and Google Calendar integration.</p>
                            </div>
                        </div>

                        {isSynced ? (
                            <div className="flex items-center gap-3 px-6 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl border border-green-100 dark:border-green-900/30 font-bold">
                                <CheckCircle className="w-5 h-5" />
                                Connected to Google Calendar
                            </div>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={syncLoading}
                                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-500/30 active:scale-95 disabled:opacity-50"
                            >
                                {syncLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                                Connect Google Calendar
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Meetings List */}
                        <div className="lg:col-span-2 space-y-8">
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black dark:text-white tracking-tight">Upcoming Meetings</h2>
                                </div>

                                <div className="space-y-4">
                                    {meetings.length === 0 ? (
                                        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 italic">
                                            No meetings scheduled. Record a note like "Schedule a meeting for tomorrow at 2 PM" to add one.
                                        </div>
                                    ) : (
                                        meetings.map(meeting => (
                                            <div key={meeting.id} className="group p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-2xl transition-all duration-300">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                {meeting.due_date ? new Date(meeting.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                                                                {meeting.end_time && ` - ${new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                            </span>
                                                            <span className="text-xs font-bold text-zinc-400 px-2">
                                                                {meeting.due_date ? new Date(meeting.due_date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : 'No date'}
                                                            </span>
                                                        </div>

                                                        <h3 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 leading-tight">
                                                            {meeting.content}
                                                        </h3>

                                                        {meeting.location && (
                                                            <div className="flex items-center gap-2 text-zinc-500 font-bold">
                                                                <MapPin className="w-4 h-4 text-red-500" />
                                                                <span>{meeting.location}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => deleteMeeting(meeting.id)}
                                                            className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 scale-125 active:scale-95"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* Live Google Calendar Feed */}
                            {isSynced && (
                                <section className="space-y-6 pt-12 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                                <GoogleIcon className="w-6 h-6" />
                                            </div>
                                            <h2 className="text-2xl font-black dark:text-white tracking-tight">Live Google Calendar Feed</h2>
                                        </div>
                                        {googleLoading && <RefreshCcw className="w-5 h-5 animate-spin text-zinc-400" />}
                                    </div>

                                    <div className="space-y-4">
                                        {googleEvents.length === 0 ? (
                                            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] text-zinc-400 italic">
                                                {googleLoading ? 'Fetching events...' : 'No events found on your Google Calendar.'}
                                            </div>
                                        ) : (
                                            googleEvents.map((event: any, idx: number) => (
                                                <div key={idx} className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Live Sync</span>
                                                            <span className="text-xs font-bold text-zinc-400">
                                                                {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'All-day'}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{event.summary}</h4>
                                                    </div>
                                                    <ExternalLink className="w-5 h-5 text-zinc-300 group-hover:text-red-500 transition-colors" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-8">
                            <div className="p-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                                <h4 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                    Voice Scheduling
                                </h4>
                                <div className="space-y-4 opacity-90 text-sm font-medium leading-relaxed">
                                    <p className="italic">"Schedule a meeting with Sarah tomorrow at 10 AM to discuss the budget."</p>
                                    <p className="italic">"Add a meeting next Friday at noon regarding the project launch."</p>
                                </div>
                                <div className="pt-4">
                                    <div className="h-1.5 w-16 bg-white/30 rounded-full" />
                                </div>
                            </div>

                            <div className="p-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 space-y-6">
                                <h4 className="text-xl font-black dark:text-white tracking-tight">Sync Features</h4>
                                <ul className="space-y-4 text-sm font-bold text-zinc-500 dark:text-zinc-400">
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                        Automatic Google Event Creation
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                        Two-way status updates (Coming Soon)
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                        Location and Participant Support
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
