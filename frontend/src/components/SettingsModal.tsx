'use client';

import React from 'react';
import { X, Moon, Sun, Monitor, Bell, Shield, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, setTheme } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <h2 className="text-xl font-black dark:text-white tracking-tight">Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 dark:text-white" />
                    </button>
                </div>

                <div className="flex h-[500px]">
                    {/* Sidebar */}
                    <div className="w-48 border-r border-zinc-100 dark:border-zinc-800 p-2 space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-sm font-bold">
                            <Monitor className="w-4 h-4" />
                            <span>Appearance</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium">
                            <User className="w-4 h-4" />
                            <span>Account</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium">
                            <Bell className="w-4 h-4" />
                            <span>Notifications</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium">
                            <Shield className="w-4 h-4" />
                            <span>Privacy</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <section>
                            <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6">Theme Preference</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 
                                        ${theme === 'light' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200'}`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center border border-zinc-100">
                                        <Sun className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <span className="text-sm font-bold dark:text-white">Light Mode</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 
                                        ${theme === 'dark' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200'}`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 shadow-md flex items-center justify-center border border-zinc-800">
                                        <Moon className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <span className="text-sm font-bold dark:text-white">Dark Mode</span>
                                </button>
                            </div>
                        </section>

                        <div className="mt-12 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                Settings are saved automatically to your browser. More advanced profile settings will be available in the future.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
