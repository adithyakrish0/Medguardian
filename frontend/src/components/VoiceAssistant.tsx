"use client";

import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, BookOpen, Pill, X, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

export default function VoiceAssistant() {
    const { isListening, messages, supported, startListening, stopListening } = useVoiceAssistant();
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Filter messages to handle streaming state
    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].type === 'user') {
            setIsGenerating(true);
        } else {
            setIsGenerating(false);
        }
    }, [messages]);

    if (!supported) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            {/* Mic Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) startListening();
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 ${isListening ? 'bg-red-50 dark:bg-red-900/20 animate-pulse' : 'bg-primary'
                    }`}
            >
                {isListening ? (
                    <Square className="w-6 h-6 text-white fill-current" />
                ) : (
                    <Mic className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Chat Bubble Scroll Area */}
            {
                isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute bottom-20 right-0 w-80 bg-card border border-card-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[450px]"
                    >
                        <div className="bg-primary p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="font-bold tracking-tight">MedGuardian AI</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex flex-col gap-2 max-w-[90%] ${msg.type === 'user' ? 'ml-auto' : 'mr-auto'}`}
                                >
                                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.type === 'user'
                                        ? 'bg-primary text-white rounded-br-none shadow-lg shadow-primary/10'
                                        : 'bg-card text-foreground shadow-sm border border-card-border rounded-bl-none'
                                        }`}>
                                        {msg.type === 'system' ? (
                                            <SimulatedStream text={msg.text} />
                                        ) : (
                                            msg.text
                                        )}
                                    </div>

                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="px-1">
                                            <SourceExpander sources={msg.sources} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {isGenerating && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mr-auto bg-card p-3 rounded-2xl rounded-bl-none border border-card-border flex gap-1"
                                >
                                    <div className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </motion.div>
                            )}
                        </div>

                        <div className="p-4 bg-secondary/5 border-t border-card-border text-center">
                            <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">
                                {isListening ? 'Listening for health queries...' : 'Tap mic to start AI consultation'}
                            </p>
                        </div>
                    </motion.div>
                )
            }
        </div >
    );
}

function SourceExpander({ sources }: { sources: any[] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getScoreColor = (score: number) => {
        if (score > 0.8) return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
        if (score > 0.6) return 'bg-yellow-500/20 text-yellow-700 border-yellow-200';
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    };

    return (
        <div className="bg-secondary/5 rounded-xl border border-card-border overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-foreground/50 hover:bg-secondary/10 transition-colors"
            >
                <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    <span>SOURCES USED ({sources.length})</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                </div>
            </button>

            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-2 space-y-2 border-t border-card-border max-h-48 overflow-y-auto custom-scrollbar"
                >
                    {sources.map((source, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-black">Source {idx + 1}</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-bold ${getScoreColor(source.score)}`}>
                                    {(source.score * 100).toFixed(0)}% RELEVANCE
                                </span>
                            </div>
                            <p className="text-[10px] text-foreground/70 italic leading-snug line-clamp-3">
                                "{source.content}"
                            </p>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

function SimulatedStream({ text }: { text: string }) {
    const [displayedText, setDisplayedText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 10 + Math.random() * 15);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text]);

    const renderContent = (content: string) => {
        // Handle [MED] and [SOURCE] tags
        const parts = content.split(/(\[MED\].*?\[\/MED\]|\[SOURCE=\d+\].*?\[\/SOURCE\])/g);

        return parts.map((part, i) => {
            if (part.startsWith('[MED]') && part.endsWith('[/MED]')) {
                const medName = part.substring(5, part.length - 6);
                return (
                    <mark key={i} className="bg-blue-100/80 text-blue-700 px-1.5 py-0.5 rounded-md font-bold border border-blue-200 shadow-sm animate-pulse inline-flex items-center gap-1">
                        <Pill className="w-3 h-3" /> {medName}
                    </mark>
                );
            }

            if (part.startsWith('[SOURCE=') && part.endsWith('[/SOURCE]')) {
                const sourceId = part.match(/\[SOURCE=(\d+)\]/)?.[1];
                const text = part.substring(part.indexOf(']') + 1, part.lastIndexOf('['));

                // Color choices based on source ID
                const colors: Record<string, string> = {
                    '1': 'bg-emerald-100/50 text-emerald-800 border-emerald-200',
                    '2': 'bg-orange-100/50 text-orange-800 border-orange-200',
                    '3': 'bg-purple-100/50 text-purple-800 border-purple-200'
                };
                const colorClass = colors[sourceId || '1'] || 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';

                return (
                    <span key={i} className={`${colorClass} px-1 rounded border border-dashed cursor-help`} title={`Source ${sourceId}`}>
                        {text}
                        <sup className="text-[8px] ml-0.5 font-black">{sourceId}</sup>
                    </span>
                );
            }

            return part;
        });
    };

    return <span className="entity-rich-text">{renderContent(displayedText)}</span>;
}
