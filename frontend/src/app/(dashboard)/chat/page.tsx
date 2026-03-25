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

        console.log('[CHAT SAVE] Saving session:', id, 'messages:', data.length);
        try {
            const res = await apiFetch('/chat/history/save', {
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
            console.log('[CHAT SAVE] Result:', res);
            if (res.success) {
                // Refresh history list after successful save
                loadHistory();
            }
        } catch (e) {
            console.error('[CHAT SAVE] Failed:', e);
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
        console.log('[CHAT HISTORY] Fetching...');
        setHistoryLoading(true);
        try {
            const res = await apiFetch('/chat/history');
            console.log('[CHAT HISTORY] Response:', res);
            if (res.success) {
                // If conversations is returned as 'data', 'conversations', or 'histories'
                const list = res.conversations || res.data || res.histories || [];
                setConversations(list);
            }
        } catch (e) {
            console.error('[CHAT HISTORY] Failed:', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const toggleHistory = () => {
        setHistoryOpen(!historyOpen);
    };

    // Load history on mount
    useEffect(() => {
        loadHistory();
    }, []);

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
                await saveConversation(sessionId, finalMessages);
                // History list is refreshed inside saveConversation
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
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs font-medium hover:bg-slate-700 hover:border-slate-600 transition-all whitespace-nowrap snap-start cursor-pointer text-slate-300 hover:text-white group"
        >
            <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <span>{label}</span>
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
            <div className="h-screen flex bg-slate-950 overflow-hidden relative">
                {/* ── History Side Panel ──────────────────────── */}
                <div className="w-[260px] h-full border-r border-slate-800 bg-slate-900/80 flex flex-col overflow-hidden shrink-0">
                    {/* Panel header (Aligned with main header) */}
                    <div className="pt-4 px-4 h-16 flex items-center shrink-0">
                        <button
                            onClick={startNewChat}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700/60 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Chat
                        </button>
                    </div>

                    <div className="text-[11px] text-slate-600 px-4 pt-5 pb-2 uppercase tracking-wider font-semibold">
                        Past conversations
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-0.5 scrollbar-none">
                        {historyLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500/50" />
                                <p className="text-xs text-slate-600 font-normal">Loading...</p>
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <p className="text-[13px] text-slate-600 font-normal">
                                    No conversations yet
                                </p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.session_id}
                                    onClick={() => loadConversation(conv.session_id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group relative ${activeSessionId === conv.session_id
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'hover:bg-slate-800 text-slate-300'
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-medium truncate">
                                            {conv.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                            <span>{formatDate(conv.updated_at)}</span>
                                            <span className="opacity-30">•</span>
                                            <span>{conv.message_count} messages</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Main Chat Area ─────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                    {/* Header */}
                    <header className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white">
                                    Guardian AI
                                </h1>
                                <p className="text-xs text-emerald-400 font-medium flex items-center gap-2 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Online · Ready to help
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={startNewChat}
                                className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all shadow-lg"
                                title="New Chat"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={toggleHistory}
                                className={`p-2 rounded-xl border transition-all shadow-lg lg:hidden ${historyOpen
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                                    }`}
                                title="Past Conversations"
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                        </div>
                    </header>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto px-6 py-6 md:px-12 md:py-8 space-y-6 scroll-smooth scrollbar-none relative z-10"
                    >
                        {/* Empty State */}
                        {messages.length === 1 && messages[0].role === 'model' && (
                            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 mb-6">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-medium text-white text-center">
                                    How can I help you today?
                                </h2>
                                <p className="text-sm text-slate-500 text-center mt-2 max-w-sm">
                                    Ask me about your medications, schedule, or health questions.
                                </p>

                                <div className="flex flex-wrap justify-center gap-2 mt-12 max-w-2xl px-4">
                                    <QuickAction
                                        label="My adherence"
                                        icon={Activity}
                                        query="How is my medication adherence doing lately?"
                                    />
                                    <QuickAction
                                        label="My medications"
                                        icon={Pill}
                                        query="List all my active medications."
                                    />
                                    <QuickAction
                                        label="Side effects"
                                        icon={AlertTriangle}
                                        query="Are there any side effects I should watch out for with my current meds?"
                                    />
                                    <QuickAction
                                        label="Refill reminders"
                                        icon={ChevronRight}
                                        query="Do I need to refill anything soon?"
                                    />
                                </div>
                            </div>
                        )}

                        {messages.length > 1 && messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                                        <Bot className="w-4 h-4 text-blue-400" />
                                    </div>
                                )}

                                <div className={`max-w-[80%] md:max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className={`px-4 py-3 rounded-2xl text-sm font-normal leading-relaxed relative group ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-sm max-w-[75%]'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm max-w-[80%]'
                                            }`}
                                    >
                                        {msg.role === 'model' ? (
                                            <div className="markdown-container">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => (
                                                            <p className="mb-4 last:mb-0 text-slate-300 font-normal">{children}</p>
                                                        ),
                                                        strong: ({ children }) => (
                                                            <strong className="font-semibold text-white">{children}</strong>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-none space-y-2 mb-4">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-300 font-normal">
                                                                {children}
                                                            </ol>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="flex items-start gap-2.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                                                <span>{children}</span>
                                                            </li>
                                                        ),
                                                        em: ({ children }) => (
                                                            <em className="italic text-blue-300">{children}</em>
                                                        ),
                                                        code: ({ children }) => (
                                                            <code className="bg-slate-900 border border-slate-700 text-blue-300 px-1.5 py-0.5 rounded text-[12px] font-normal mx-0.5">
                                                                {children}
                                                            </code>
                                                        ),
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <span>{msg.content}</span>
                                        )}
                                    </div>
                                    <div
                                        className={`text-[11px] text-slate-500 font-normal mt-1 px-1 flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <span>{formatTime(msg.timestamp)}</span>
                                    </div>
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                                        <span className="text-xs font-semibold text-white">
                                            {user?.full_name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-4 justify-start"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="bg-slate-800 border border-slate-700/50 px-5 py-3.5 rounded-2xl rounded-tl-sm inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="px-6 pb-6 pt-3 bg-slate-950 border-t border-slate-800/60 shrink-0 z-10">
                        {/* Quick Actions (only show if not in empty state) */}
                        {messages.length > 1 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none snap-x mask-linear-fade">
                                <QuickAction
                                    label="My adherence"
                                    icon={Activity}
                                    query="How is my medication adherence doing lately?"
                                />
                                <QuickAction
                                    label="My medications"
                                    icon={Pill}
                                    query="List all my active medications."
                                />
                                <QuickAction
                                    label="Side effects"
                                    icon={AlertTriangle}
                                    query="Are there any side effects I should watch out for with my current meds?"
                                />
                                <QuickAction
                                    label="Refill reminders"
                                    icon={ChevronRight}
                                    query="Do I need to refill anything soon?"
                                />
                            </div>
                        )}

                        <div className="relative flex flex-col gap-2">
                            <div className="relative flex items-center gap-3">
                                <input
                                    id="chat-input"
                                    name="chat-input"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about your medications..."
                                    className="flex-1 bg-slate-800 text-white rounded-xl pl-5 pr-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-blue-500/40 border border-slate-700 hover:border-slate-600 transition-all placeholder:text-slate-500"
                                    disabled={loading}
                                    autoFocus
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center shrink-0"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-center text-[11px] text-slate-700 font-normal">
                                AI responses may not be medically accurate. Always consult your doctor.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </SeniorOnly>
    );
}
