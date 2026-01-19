'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    stream: MediaStream | null;
    isRecording: boolean;
}

export default function AudioVisualizer({ stream, isRecording }: Props) {
    const [volumes, setVolumes] = useState<number[]>(new Array(15).fill(2));
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (isRecording && stream) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyzerRef.current = audioContextRef.current.createAnalyser();
            analyzerRef.current.fftSize = 64;
            source.connect(analyzerRef.current);

            const bufferLength = analyzerRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                if (analyzerRef.current) {
                    analyzerRef.current.getByteFrequencyData(dataArray);
                    // Take some samples and map them to heights
                    const newVolumes = Array.from({ length: 15 }, (_, i) => {
                        const index = Math.floor((i * bufferLength) / 15);
                        return Math.max(4, (dataArray[index] / 255) * 40);
                    });
                    setVolumes(newVolumes);
                }
                animationFrameRef.current = requestAnimationFrame(update);
            };

            update();
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            setVolumes(new Array(15).fill(4));
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [isRecording, stream]);

    return (
        <div className="flex items-center justify-center gap-1 h-12 w-full">
            <AnimatePresence>
                {volumes.map((vol, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 4 }}
                        animate={{ height: isRecording ? vol : 4 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                            mass: 0.5
                        }}
                        className="w-1.5 bg-blue-500 rounded-full"
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
