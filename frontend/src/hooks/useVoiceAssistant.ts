"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function useVoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState<{ text: string, type: 'user' | 'system' }[]>([]);
    const [supported, setSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    const router = useRouter();

    const speak = useCallback((text: string) => {
        setMessages(prev => [...prev, { text, type: 'system' }]);
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }, []);

    const processCommand = useCallback(async (command: string) => {
        const cmd = command.toLowerCase();

        if (cmd.includes('dashboard') || cmd.includes('home')) {
            speak("Opening dashboard...");
            setTimeout(() => router.push('/dashboard'), 1500);
            return;
        }

        if (cmd.includes('medications') || cmd.includes('medicine list')) {
            speak("Opening medications list...");
            setTimeout(() => router.push('/medications'), 1500);
            return;
        }

        if (cmd.includes('next medication') || cmd.includes("what's next")) {
            try {
                const data = await apiFetch('/medication-status');
                if (data.upcoming?.length > 0) {
                    const next = data.upcoming[0];
                    speak(`Your next medication is ${next.name} at ${next.time}.`);
                } else {
                    speak("You have no more medications scheduled for today.");
                }
            } catch (err) {
                speak("I couldn't check your schedule.");
            }
            return;
        }

        if (cmd.includes('emergency') || cmd.includes('sos')) {
            speak("Activating emergency SOS now!");
            // Call SOS logic here
            return;
        }

        speak("I didn't quite get that. Try saying 'Dashboard' or 'Next medication'.");
    }, [router, speak]);

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.log("Already listening");
            }
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setSupported(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setMessages(prev => [...prev, { text: transcript, type: 'user' }]);
                processCommand(transcript);
            };

            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            recognitionRef.current = recognition;
        }
    }, [processCommand]);

    return {
        isListening,
        messages,
        supported,
        startListening,
        stopListening,
        speak
    };
}
