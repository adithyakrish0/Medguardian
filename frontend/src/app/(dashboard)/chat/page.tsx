"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    Pill,
    Activity,
    AlertTriangle,
    ChevronRight,
    Clock,
    Plus,
    MessageSquare,
    X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useUser } from '@/hooks/useUser';

import { SeniorOnly } from '@/components/RoleGuard';

// ── Types ──────────────────────────────────────────────────
interface Message {
    role: 'user' | 'model';
    content: string;
    timestamp: string; // ISO string for serialisation
}

interface ConversationSummary {
    id: number;
    session_id: string;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────
const genSessionId = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

const GREETING: Message = {
    role: 'model',
    content:
        "Hello! I'm MedGuardian, your personal health assistant. I have access to your medication schedule and adherence records.\n\nHow can I help you today?",
    timestamp: new Date().toISOString(),
};

// ── Component ──────────────────────────────────────────────
export default function AskGuardianPage() {
    const { user } = useUser();

    // Chat state
    const [sessionId, setSessionId] = useState(genSessionId);
    const [messages, setMessages] = useState<Message[]>([GREETING]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // History panel state
    const [historyOpen, setHistoryOpen] = useState(false);
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Track whether the session has real user messages (to decide if we need to save)
    const hasUserMessages = messages.some(m => m.role === 'user');

    // ── Scroll ─────────────────────────────────────────────
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };
    useEffect(() => { scrollToBottom(); }, [messages]);

    // ── Save conversation ──────────────────────────────────
    const saveConversation = useCallback(async (sid?: string, msgs?: Message[]) => {
        const id = sid ?? sessionId;
        const data = msgs ?? messages;
        // Only save if there are real user messages (not just the greeting)
        const realMessages = data.filter(
            m => !(m.role === 'model' && m.content.startsWith("Hello! I'm MedGuardian"))
        );
        if (realMessages.length < 1) return;

        const firstUserMsg = data.find(m => m.role === 'user');
        const title = firstUserMsg
            ? firstUserMsg.content.slice(0, 55)
            : 'New Chat';

        try {
            await apiFetch('/chat/history/save', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: id,
                    title,
                    messages: data.map(m => ({
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp,
                    })),
                }),
            });
        } catch (e) {
            console.error('Failed to save chat history:', e);
        }
    }, [sessionId, messages]);

    // ── Auto‑save on unmount / navigate away ───────────────
    useEffect(() => {
        return () => {
            // Fire-and-forget save on cleanup
            if (hasUserMessages) {
                saveConversation();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, messages]);

    // ── Load history list ──────────────────────────────────
    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await apiFetch('/chat/history');
            if (res.success) {
                setConversations(res.conversations);
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const toggleHistory = () => {
        const opening = !historyOpen;
        setHistoryOpen(opening);
        if (opening) loadHistory();
    };

    // ── Load a past conversation ───────────────────────────
    const loadConversation = async (sid: string) => {
        // Save current conversation first
        if (hasUserMessages) {
            await saveConversation();
        }

        try {
            const res = await apiFetch(`/chat/history/${sid}`);
            if (res.success) {
                setSessionId(sid);
                setActiveSessionId(sid);
                setMessages(
                    res.messages.map((m: any) => ({
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp || new Date().toISOString(),
                    }))
                );
                setHistoryOpen(false);
            }
        } catch (e) {
            console.error('Failed to load conversation:', e);
        }
    };

    // ── Start new chat ─────────────────────────────────────
    const startNewChat = async () => {
        // Save current conversation first
        if (hasUserMessages) {
            await saveConversation();
        }

        const newSid = genSessionId();
        setSessionId(newSid);
        setActiveSessionId(null);
        setMessages([{ ...GREETING, timestamp: new Date().toISOString() }]);
        setInput('');
        setHistoryOpen(false);
    };

    // ── Send message ───────────────────────────────────────
    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setLoading(true);

        try {
            const history = updatedMessages
                .filter(m => !(m.role === 'model' && m.content.startsWith("Hello! I'm MedGuardian")))
                .map(m => ({ role: m.role, content: m.content }));

            const response = await apiFetch('/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: userMsg.content,
                    history,
                }),
            });

            if (response.success) {
                const aiMsg: Message = {
                    role: 'model',
                    content: response.response,
                    timestamp: new Date().toISOString(),
                };
                const finalMessages = [...updatedMessages, aiMsg];
                setMessages(finalMessages);

                // Auto-save after each exchange
                saveConversation(sessionId, finalMessages);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'model',
                        content:
                            "I'm having trouble connecting to my brain right now. Please try again later.",
                        timestamp: new Date().toISOString(),
                    },
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    content: 'Sorry, something went wrong. Please check your connection.',
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Quick actions ──────────────────────────────────────
    const QuickAction = ({
        label,
        icon: Icon,
        query,
    }: {
        label: string;
        icon: any;
        query: string;
    }) => (
        <button
            onClick={() => setInput(query)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap snap-start cursor-pointer hover:border-blue-500 group"
        >
            <Icon className="w-3.5 h-3.5 text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-gray-300 group-hover:text-gray-100 transition-colors">{label}</span>
        </button>
    );

    // ── Format timestamp ───────────────────────────────────
    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '';
        }
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (d.toDateString() === today.toDateString()) return 'Today';
            if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    // ── Render ─────────────────────────────────────────────
    return (
        <SeniorOnly>
            <div className="h-[calc(100vh-6rem)] flex bg-slate-950 overflow-hidden rounded-3xl border border-white/10 shadow-2xl relative">
                {/* ── History Side Panel ──────────────────────── */}
                <AnimatePresence>
                    {historyOpen && (
                        <>
                            {/* Mobile Overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setHistoryOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] lg:hidden"
                            />
                            <motion.div
                                initial={{ x: -320 }}
                                animate={{ x: 0 }}
                                exit={{ x: -320 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed lg:relative left-0 top-0 bottom-0 w-[320px] h-full border-r border-white/10 bg-slate-900/50 backdrop-blur-xl flex flex-col overflow-hidden shrink-0 z-[90] lg:z-0 shadow-2xl"
                            >
                                {/* Panel header */}
                                <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                                    <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">
                                        NEURAL_MEMORY_BUFFER
                                    </h2>
                                    <button
                                        onClick={() => setHistoryOpen(false)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* New chat button */}
                                <div className="p-4 shrink-0">
                                    <button
                                        onClick={startNewChat}
                                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl group"
                                    >
                                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                        INITIALIZE_NEW_LINK
                                    </button>
                                </div>

                                {/* Conversation list */}
                                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 scrollbar-none">
                                    {historyLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">RECALLING_STATES...</p>
                                        </div>
                                    ) : conversations.length === 0 ? (
                                        <div className="text-center py-12">
                                            <MessageSquare className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                                LOGS_EMPTY_SET
                                            </p>
                                        </div>
                                    ) : (
                                        conversations.map(conv => (
                                            <button
                                                key={conv.session_id}
                                                onClick={() => loadConversation(conv.session_id)}
                                                className={`w-full text-left p-4 rounded-2xl transition-all group relative border ${activeSessionId === conv.session_id
                                                    ? 'bg-blue-500/10 border-blue-500/30'
                                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${activeSessionId === conv.session_id ? 'text-blue-400' : 'text-slate-600'}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-black text-white uppercase tracking-tight truncate text-xs group-hover:text-blue-400 transition-colors">
                                                            {conv.title}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                                {formatDate(conv.updated_at)}
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-800" />
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                                {conv.message_count}_MSGS
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {activeSessionId === conv.session_id && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── Main Chat Area ─────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                    {/* Header */}
                    <header className="bg-slate-900/50 backdrop-blur-md px-8 py-6 border-b border-white/10 flex items-center justify-between shrink-0 pt-16 lg:pt-6 z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-inner backdrop-blur-sm group hover:scale-110 transition-transform">
                                <Bot className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                                    GUARDIAN_AI_ASSISTANT
                                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                                        v6.2
                                    </span>
                                </h1>
                                <p className="text-[9px] font-black text-teal-400 uppercase tracking-[0.3em] flex items-center gap-2 mt-1.5">
                                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                                    ACTIVE_NEURAL_UPLINK
                                </p>
                            </div>
                        </div>

                        {/* History toggle */}
                        <button
                            onClick={toggleHistory}
                            className={`p-3.5 rounded-2xl transition-all shadow-xl border ${historyOpen
                                ? 'bg-blue-500 text-white border-blue-400'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white hover:text-slate-950'
                                }`}
                            title="Memory History"
                        >
                            <Clock className="w-5 h-5" />
                        </button>
                    </header>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10 scroll-smooth scrollbar-none relative z-10"
                    >
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'model' && (
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-md shrink-0 mt-1">
                                        <Sparkles className="w-5 h-5 text-blue-400" />
                                    </div>
                                )}

                                <div className={`max-w-[85%] md:max-w-[75%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className={`p-6 rounded-2xl text-[13px] font-bold leading-relaxed shadow-2xl backdrop-blur-md relative overflow-hidden group ${msg.role === 'user'
                                            ? 'bg-blue-600/90 text-white border border-blue-400/30 rounded-tr-none'
                                            : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                                            }`}
                                    >
                                        {msg.role === 'model' && (
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                                <Bot className="w-12 h-12 text-white" />
                                            </div>
                                        )}
                                        {msg.role === 'model' ? (
                                            <div className="markdown-container">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => (
                                                            <p className="mb-4 last:mb-0 text-slate-300 font-bold">{children}</p>
                                                        ),
                                                        strong: ({ children }) => (
                                                            <strong className="font-black text-white italic uppercase tracking-tight">{children}</strong>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-none space-y-3 mb-4">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="list-decimal list-inside mb-4 space-y-3 text-slate-300 font-bold">
                                                                {children}
                                                            </ol>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="flex items-start gap-3">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                                                <span>{children}</span>
                                                            </li>
                                                        ),
                                                        em: ({ children }) => (
                                                            <em className="italic text-blue-400 font-black">{children}</em>
                                                        ),
                                                        code: ({ children }) => (
                                                            <code className="bg-black/40 border border-white/10 text-blue-300 px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-widest mx-1 shadow-inner">
                                                                {children}
                                                            </code>
                                                        ),
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <span className="tracking-tight">{msg.content}</span>
                                        )}
                                    </div>
                                    <div
                                        className={`text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-2 flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <span>{formatTime(msg.timestamp)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span>{msg.role === 'user' ? 'U_NODE' : 'AI_NODE'}</span>
                                    </div>
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-inner backdrop-blur-md shrink-0 mt-1">
                                        <User className="w-5 h-5 text-blue-400" />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-6 justify-start"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                                    <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl rounded-tl-none shadow-2xl backdrop-blur-md flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">PROCESSING_INFERENCE...</span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-8 md:p-10 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 shrink-0 z-10 box-shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                        {/* Quick Actions */}
                        <div className="flex gap-4 mb-8 overflow-x-auto pb-4 scrollbar-none snap-x mask-linear-fade">
                            <QuickAction
                                label="COMPLIANCE_VECTOR"
                                icon={Activity}
                                query="How is my medication adherence doing lately?"
                            />
                            <QuickAction
                                label="ACTIVE_RECORDS"
                                icon={Pill}
                                query="List all my active medications."
                            />
                            <QuickAction
                                label="SAFETY_PROTOCOL"
                                icon={AlertTriangle}
                                query="Are there any side effects I should watch out for with my current meds?"
                            />
                            <QuickAction
                                label="REFILL_STATUS"
                                icon={ChevronRight}
                                query="Do I need to refill anything soon?"
                            />
                        </div>

                        <div className="relative flex items-center gap-4">
                            <div className="absolute left-6 text-blue-500/20 pointer-events-none">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <input
                                id="chat-input"
                                name="chat-input"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="ASK_GUARDIAN_ANYTHING..."
                                className="flex-1 bg-white/5 text-white rounded-2xl pl-16 pr-8 py-5 text-sm font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/30 border border-white/5 hover:border-white/10 transition-all placeholder:text-slate-700 backdrop-blur-md shadow-inner"
                                disabled={loading}
                                autoFocus
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="p-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-95 group"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                )}
                            </button>
                        </div>
                        <div className="mt-4 flex flex-col items-center">
                            <div className="w-full h-[1px] bg-white/5 mt-2 mb-4" />
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-amber-500/50" />
                                AI_DETERMINISTIC_VARIANCE_WARNING: VERIFY_CRITICAL_TELEMETRY
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </SeniorOnly>
    );
}
