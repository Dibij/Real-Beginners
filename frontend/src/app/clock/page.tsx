'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock as ClockIcon, Bell, Calendar, Plus, Trash2, Volume2, Save, Play, X, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import api from '@/utils/api';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

const DEFAULT_SOUNDS = [
    { name: 'Custom: Your Phone Ringing', url: '/sounds/alarm_default.mp3' },
    { name: 'Classic Alarm', url: 'https://assets.mixkit.co/active_storage/sfx/1010/1010-preview.mp3' },
    { name: 'Gentle Beep', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
    { name: 'Church Bell', url: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3' },
    { name: 'Digital Alert', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
];

export default function ClockPage() {
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [alarms, setAlarms] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSound, setSelectedSound] = useState(DEFAULT_SOUNDS[0].url);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Form States
    const [showAlarmForm, setShowAlarmForm] = useState(false);
    const [showReminderForm, setShowReminderForm] = useState(false);
    const [newAlarm, setNewAlarm] = useState({ time: '08:00', label: '' });
    const [newReminder, setNewReminder] = useState({ content: '', date: '', time: '' });

    // Load sound preference
    useEffect(() => {
        const savedSound = localStorage.getItem('alarm_sound');
        if (savedSound) setSelectedSound(savedSound);
    }, []);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        try {
            const [alarmsRes, remindersRes] = await Promise.all([
                api.get('alarms/'),
                api.get('action-items/', { params: { type: 'Reminder' } })
            ]);
            setAlarms(alarmsRes.data.results || alarmsRes.data);
            setReminders(remindersRes.data.results || remindersRes.data);
        } catch (err) {
            console.error('Failed to fetch alarms/reminders', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const toggleAlarm = async (id: number, currentStatus: boolean) => {
        try {
            await api.patch(`alarms/${id}/`, { is_active: !currentStatus });
            setAlarms(alarms.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
        } catch (err) {
            console.error('Failed to toggle alarm', err);
        }
    };

    const deleteAlarm = async (id: number) => {
        if (!confirm('Are you sure you want to delete this alarm? Any synced reminders will also be unlinked or deleted.')) return;
        try {
            await api.delete(`alarms/${id}/`);
            setAlarms(alarms.filter(a => a.id !== id));
            // Deletion of linked items is handled by backend, but we should refresh to be sure
            fetchData();
        } catch (err) {
            console.error('Failed to delete alarm', err);
        }
    };

    const deleteReminder = async (id: number) => {
        if (!confirm('Are you sure you want to delete this reminder? The synced alarm will also be removed.')) return;
        try {
            await api.delete(`action-items/${id}/`);
            setReminders(reminders.filter(r => r.id !== id));
            fetchData(); // Sync removal on UI
        } catch (err) {
            console.error('Failed to delete reminder', err);
        }
    };

    const handleCreateAlarm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('alarms/', newAlarm);
            setAlarms([...alarms, res.data]);
            setShowAlarmForm(false);
            setNewAlarm({ time: '08:00', label: '' });
        } catch (err) {
            console.error('Failed to create alarm', err);
        }
    };

    const handleCreateReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const due_date = newReminder.date && newReminder.time
                ? `${newReminder.date}T${newReminder.time}:00`
                : null;

            const res = await api.post('action-items/', {
                content: newReminder.content,
                item_type: 'Reminder',
                due_date: due_date
            });

            // Backend auto-creates alarm, so refresh everything
            fetchData();
            setShowReminderForm(false);
            setNewReminder({ content: '', date: '', time: '' });
        } catch (err) {
            console.error('Failed to create reminder', err);
        }
    };

    const saveSoundPreference = (url: string) => {
        setSelectedSound(url);
        localStorage.setItem('alarm_sound', url);
    };

    const testSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                        className="flex items-center gap-2 text-zinc-500 hover:text-blue-600 font-bold transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </button>

                    <audio ref={audioRef} src={selectedSound} />

                    {/* Header / Big Clock */}
                    <div className="flex flex-col items-center justify-center space-y-4 py-12 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl -translate-y-full group-hover:translate-y-full pointer-events-none" />
                        <ClockIcon className="w-16 h-16 opacity-80 animate-pulse mb-2" />
                        <h1 className="text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl">
                            {formatTime(currentTime)}
                        </h1>
                        <p className="text-2xl opacity-90 font-medium tracking-widest uppercase">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Alarms Column */}
                        <div className="lg:col-span-2 space-y-12">
                            {/* Alarms Section */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 shadow-sm">
                                            <Bell className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-3xl font-bold dark:text-white tracking-tight">Alarms</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowAlarmForm(!showAlarmForm)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-orange-500/30 active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span>Quick Add</span>
                                    </button>
                                </div>

                                {showAlarmForm && (
                                    <form onSubmit={handleCreateAlarm} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border-2 border-orange-200 dark:border-orange-900/20 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-4">
                                        <input
                                            type="time"
                                            value={newAlarm.time}
                                            onChange={e => setNewAlarm({ ...newAlarm, time: e.target.value })}
                                            className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold focus:ring-2 ring-orange-400 outline-none flex-1 min-w-[120px]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Label (e.g. Wake Up)"
                                            value={newAlarm.label}
                                            onChange={e => setNewAlarm({ ...newAlarm, label: e.target.value })}
                                            className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:ring-2 ring-orange-400 outline-none flex-[2] min-w-[200px]"
                                        />
                                        <button type="submit" className="p-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors px-8">
                                            Add Alarm
                                        </button>
                                        <button type="button" onClick={() => setShowAlarmForm(false)} className="p-3 text-zinc-400 hover:text-zinc-600">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </form>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {alarms.length === 0 ? (
                                        <div className="col-span-full text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 italic">
                                            No alarms set. Say "Create an alarm for 7 AM" to add one.
                                        </div>
                                    ) : (
                                        alarms.map(alarm => (
                                            <div key={alarm.id} className="group relative flex items-center justify-between p-7 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                                                <div>
                                                    <div className="text-4xl font-black text-zinc-800 dark:text-zinc-100 tabular-nums leading-none mb-2">
                                                        {alarm.time.slice(0, 5)}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-400 font-black uppercase tracking-widest">
                                                            {alarm.label || 'Standard Alarm'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => toggleAlarm(alarm.id, alarm.is_active)}
                                                        className={`w-14 h-8 rounded-full p-1 transition-all duration-500 shadow-inner ${alarm.is_active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${alarm.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAlarm(alarm.id)}
                                                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 scale-110 active:scale-95"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* Reminders Section */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 shadow-sm text-blue-600">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-3xl font-bold dark:text-white tracking-tight">Reminders</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowReminderForm(!showReminderForm)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span>Create New</span>
                                    </button>
                                </div>

                                {showReminderForm && (
                                    <form onSubmit={handleCreateReminder} className="bg-zinc-50 dark:bg-zinc-900/50 p-7 rounded-[2.5rem] border-2 border-blue-200 dark:border-blue-900/20 space-y-4 animate-in fade-in slide-in-from-top-4">
                                        <input
                                            type="text"
                                            placeholder="What do you want to be reminded of?"
                                            required
                                            value={newReminder.content}
                                            onChange={e => setNewReminder({ ...newReminder, content: e.target.value })}
                                            className="w-full bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-bold focus:ring-2 ring-blue-400 outline-none"
                                        />
                                        <div className="flex gap-4">
                                            <input
                                                type="date"
                                                value={newReminder.date}
                                                onChange={e => setNewReminder({ ...newReminder, date: e.target.value })}
                                                className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex-1 focus:ring-2 ring-blue-400 outline-none"
                                            />
                                            <input
                                                type="time"
                                                value={newReminder.time}
                                                onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
                                                className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex-1 focus:ring-2 ring-blue-400 outline-none"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button type="button" onClick={() => setShowReminderForm(false)} className="px-6 py-3 text-zinc-500 font-bold">Cancel</button>
                                            <button type="submit" className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all">Save Reminder</button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-4">
                                    {reminders.length === 0 ? (
                                        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 italic">
                                            No upcoming reminders.
                                        </div>
                                    ) : (
                                        reminders.map(reminder => (
                                            <div key={reminder.id} className="group p-7 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 border-l-[10px] border-l-blue-500 shadow-sm hover:shadow-2xl transition-all duration-300">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5">
                                                                <ClockIcon className="w-3 h-3" />
                                                                {reminder.due_date ? new Date(reminder.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                                            </span>
                                                            {reminder.linked_alarm && (
                                                                <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                                                    <RefreshCw className="w-3 h-3" />
                                                                    Synced with Alarm
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-bold text-zinc-400 px-2">
                                                                {reminder.due_date ? new Date(reminder.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date'}
                                                            </span>
                                                        </div>
                                                        <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 leading-tight">
                                                            {reminder.content}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteReminder(reminder.id)}
                                                        className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 scale-125 active:scale-95"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Settings Column */}
                        <div className="space-y-8">
                            <div className="p-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 space-y-8 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 shadow-sm">
                                        <Volume2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black dark:text-white tracking-tight">Audio</h3>
                                </div>

                                <div className="space-y-3">
                                    {DEFAULT_SOUNDS.map(sound => (
                                        <button
                                            key={sound.url}
                                            onClick={() => saveSoundPreference(sound.url)}
                                            className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${selectedSound === sound.url ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 hover:border-indigo-400 text-zinc-700 dark:text-zinc-200 shadow-sm'}`}
                                        >
                                            <span className="font-bold text-lg">{sound.name}</span>
                                            {selectedSound === sound.url && <div className="w-3 h-3 rounded-full bg-white animate-ping" />}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={testSound}
                                    className="w-full flex items-center justify-center gap-3 py-5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-2xl font-black transition-all shadow-md active:scale-[0.98]"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    Test Selection
                                </button>

                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                                    <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed flex gap-2">
                                        <span className="text-base">💡</span>
                                        Your preference is saved and will be used for all synced timers.
                                    </p>
                                </div>
                            </div>

                            <div className="p-10 bg-gradient-to-br from-zinc-800 to-black rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                                <h4 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 text-blue-400" />
                                    Smart Sync
                                </h4>
                                <div className="space-y-4 opacity-80 text-sm font-medium leading-relaxed">
                                    <p>Manual reminders with a specific time are automatically synced with a system alarm.</p>
                                    <p>Deleting a linked alarm will automatically cleanup any associated tasks or shopping list items.</p>
                                </div>
                                <div className="pt-2">
                                    <div className="h-1 w-12 bg-blue-500 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
