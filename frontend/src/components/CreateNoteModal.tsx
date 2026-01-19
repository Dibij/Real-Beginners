'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Save, Loader2, Play, Pause, RotateCcw } from 'lucide-react';
import api from '@/utils/api';
import AudioVisualizer from './AudioVisualizer';

interface Category {
    id: number;
    name: string;
    color: string;
}

interface NoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
    onProcessing?: (isProcessing: boolean, noteId?: number) => void;
}

export default function CreateNoteModal({ isOpen, onClose, onRefresh, onProcessing }: NoteModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
    const [audioUrls, setAudioUrls] = useState<string[]>([]);
    const audioChunksRef = useRef<Blob[]>([]);
    const socketRef = useRef<WebSocket | null>(null);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null); // Changed from isPlaying

    useEffect(() => {
        if (!isOpen) {
            stopRecording();
            resetAudioState();
        }
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [isOpen]);

    const resetAudioState = () => {
        setAudioBlobs([]);
        audioUrls.forEach(url2 => URL.revokeObjectURL(url2)); // Revoke all URLs
        setAudioUrls([]);
        setPlayingIndex(null); // Reset playing index
    };

    const startRecording = async () => {
        if (isStarting) return;
        setIsStarting(true);
        try {
            const token = localStorage.getItem('access_token');
            const wsUrl = `ws://localhost:8000/ws/transcribe/?token=${token}`;
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onopen = () => {
                socketRef.current?.send(JSON.stringify({ type: 'start_recording' }));
            };

            socketRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcription_update' || data.type === 'transcription_final') {
                    setContent(prev => {
                        // Avoid duplicates if partials are sent
                        return data.transcript;
                    });
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            audioChunksRef.current = [];

            const newMediaRecorder = new MediaRecorder(stream);

            newMediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    // Stream to socket
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(event.data);
                    }
                }
            };

            newMediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlobs(prev => [...prev, blob]);
                const url = URL.createObjectURL(blob);
                setAudioUrls(prev => [...prev, url]);
            };

            newMediaRecorder.start(500); // Send chunks every 500ms
            setMediaRecorder(newMediaRecorder);
            setIsRecording(true);
            setIsStarting(false);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setIsStarting(false);
        }
    };

    const stopRecording = () => {
        if (isStarting) return;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current) {
            socketRef.current.send(JSON.stringify({ type: 'stop_recording' }));
            // Give it a moment to send the final transcript before closing
            setTimeout(() => {
                socketRef.current?.close();
                socketRef.current = null;
            }, 1000);
        }
        setIsRecording(false);
        setIsStarting(false);
        setMediaRecorder(null);
        setAudioStream(null);
    };

    const togglePlayback = (index: number) => {
        const audio = document.getElementById(`audio-${index}`) as HTMLAudioElement;
        if (!audio) return;

        if (playingIndex === index) {
            audio.pause();
            setPlayingIndex(null);
        } else {
            // Stop current if any
            if (playingIndex !== null) {
                const prev = document.getElementById(`audio-${playingIndex}`) as HTMLAudioElement;
                if (prev) prev.pause();
            }
            audio.play();
            setPlayingIndex(index);
        }
    };

    const removeRecording = (index: number) => {
        URL.revokeObjectURL(audioUrls[index]);
        setAudioBlobs(prev => prev.filter((_, i) => i !== index));
        setAudioUrls(prev => prev.filter((_, i) => i !== index));
        if (playingIndex === index) setPlayingIndex(null);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title || 'Voice Note ' + new Date().toLocaleString());
            formData.append('content', content || 'Audio Recording');

            audioBlobs.forEach((blob, index) => {
                formData.append('audio_files', blob, `recording_${index}.webm`);
            });

            const res = await api.post('notes/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Close modal immediately and show processing toast
            onClose();
            onProcessing?.(true, res.data.id);
            onRefresh();

            setTitle('');
            setContent('');
            resetAudioState();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                    <h2 className="text-2xl font-bold dark:text-white">New Voice Note</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-6 h-6 dark:text-zinc-400" />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    <input
                        type="text"
                        placeholder="Title your note..."
                        className="w-full text-3xl font-bold bg-transparent outline-none dark:text-white border-b-2 border-transparent focus:border-blue-500 pb-2 transition-all"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="relative group">
                        <textarea
                            placeholder="Type details or note here..."
                            className="w-full h-48 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 rounded-2xl outline-none dark:text-white resize-none text-xl leading-relaxed border border-zinc-100 dark:border-zinc-800 focus:border-blue-500/50 transition-all font-medium"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {isRecording && (
                            <div className="absolute top-4 right-6 flex items-center gap-2">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Live</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                        <div className="w-full max-w-md">
                            <AudioVisualizer stream={audioStream} isRecording={isRecording} />
                        </div>

                        <div className="flex flex-col items-center gap-6 mt-6 w-full">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isStarting || isLoading}
                                className={`flex items-center gap-4 px-10 py-5 rounded-full font-bold text-xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${isRecording
                                    ? 'bg-red-500 text-white shadow-red-500/40 ring-4 ring-red-500/20'
                                    : 'bg-blue-600 text-white shadow-blue-600/40 hover:bg-blue-700'
                                    }`}
                            >
                                <Mic className={`w-7 h-7 ${isRecording ? 'animate-pulse' : ''}`} />
                                {isStarting ? 'Starting...' : isRecording ? 'Stop Recording' : 'Add Recording'}
                            </button>

                            {audioUrls.length > 0 && !isRecording && (
                                <div className="w-full space-y-3">
                                    <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Recordings ({audioUrls.length})</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {audioUrls.map((url, index) => (
                                            <div key={index} className="flex items-center gap-4 p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                                                <button
                                                    onClick={() => togglePlayback(index)}
                                                    className="p-3 rounded-full bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all"
                                                >
                                                    {playingIndex === index ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                                </button>
                                                <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-emerald-500 transition-all duration-300 ${playingIndex === index ? 'w-1/2' : 'w-0'}`} />
                                                </div>
                                                <button
                                                    onClick={() => removeRecording(index)}
                                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <audio
                                                    id={`audio-${index}`}
                                                    src={url}
                                                    onEnded={() => setPlayingIndex(null)}
                                                    className="hidden"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 font-bold dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-wider text-sm">
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || (!content && audioBlobs.length === 0)}
                            className="flex-[2] py-4 px-6 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-30 uppercase tracking-wider text-sm shadow-xl shadow-blue-600/20"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                            Save Voice Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
