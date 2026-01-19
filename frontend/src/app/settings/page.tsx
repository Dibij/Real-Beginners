'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { User, Bell, Shield, Moon, Monitor } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="flex bg-zinc-50 dark:bg-black min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold dark:text-white mb-8">Settings</h1>

                <div className="space-y-6">
                    <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <User className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">{user?.username}</h2>
                                <p className="text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                            </div>
                        </div>
                        <button className="text-blue-600 font-semibold hover:underline">Edit Profile</button>
                    </section>

                    <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Preferences</h3>

                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                                <Moon className="w-5 h-5 dark:text-zinc-400" />
                                <span className="dark:text-white">Dark Mode</span>
                            </div>
                            <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 dark:text-zinc-400" />
                                <span className="dark:text-white">Notifications</span>
                            </div>
                            <div className="w-12 h-6 bg-zinc-300 dark:bg-zinc-700 rounded-full relative">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 dark:text-zinc-400" />
                                <span className="dark:text-white">Encryption (Always On)</span>
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded uppercase">Active</span>
                        </div>
                    </section>

                    <button className="w-full p-4 bg-zinc-200 dark:bg-zinc-800 dark:text-white font-bold rounded-2xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        Save Changes
                    </button>
                </div>
            </main>
        </div>
    );
}
