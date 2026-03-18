import { useCallback } from 'react';

// Simple queue to prevent overlapping audio
const audioQueue: string[] = [];
let isPlaying = false;

async function playNext() {
  if (isPlaying || audioQueue.length === 0) return;
  
  isPlaying = true;
  const text = audioQueue.shift()!;
  
  try {
    const response = await fetch('/api/v1/tts/synthesize', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'af_heart', speed: 0.95 })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        isPlaying = false;
        playNext(); // play next in queue
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        isPlaying = false;
        playNext();
      };
      
      await audio.play();
    } else {
      // Fallback to Web Speech API if backend unavailable
      fallbackSpeak(text);
      isPlaying = false;
      playNext();
    }
  } catch (error) {
    console.warn("Neural TTS error, using fallback:", error);
    fallbackSpeak(text);
    isPlaying = false;
    playNext();
  }
}

function fallbackSpeak(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel current speech to prevent queuing build-up in fallback
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function useVoiceAlert() {
  const speak = useCallback((text: string) => {
    // Check if voice alerts are enabled (stored in localStorage from settings)
    const voiceEnabled = typeof window !== 'undefined' && localStorage.getItem('voiceAlerts') !== 'false';
    if (!voiceEnabled) return;
    
    audioQueue.push(text);
    playNext();
  }, []);
  
  return { speak };
}
