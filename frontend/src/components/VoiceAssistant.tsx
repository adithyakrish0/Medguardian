"use client";

import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useState } from 'react';

export default function VoiceAssistant() {
    const { isListening, messages, supported, startListening, stopListening } = useVoiceAssistant();
    const [isOpen, setIsOpen] = useState(false);

    if (!supported) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            {/* Mic Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) startListening();
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-medical-primary'
                    }`}
            >
                <span className="text-2xl text-white">{isListening ? '🛑' : '🎙️'}</span>
            </button>

            {/* Chat Bubble */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-80 medical-card shadow-2xl overflow-hidden flex flex-col max-h-[400px]">
                    <div className="bg-medical-primary p-4 text-white flex justify-between items-center">
                        <span className="font-bold">MedGuardian AI</span>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-medical-light/30">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.type === 'user'
                                    ? 'ml-auto bg-medical-secondary text-white rounded-br-none'
                                    : 'mr-auto bg-background text-foreground shadow-sm border border-gray-100 dark:border-white/10 rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-500 font-medium">
                            {isListening ? 'Listening for commands...' : 'Tap the mic to start listening'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
