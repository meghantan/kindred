'use client';

import { useState, useRef } from 'react';
import { Mic, Send, History, StopCircle, Loader2 } from 'lucide-react';

interface Translation {
  id: string;
  original: string;
  translated: string;
  fromLang: string;
  toLang: string;
  timestamp: Date;
}

export default function TranslationPage() {
  // --- State Management ---
  const [inputText, setInputText] = useState('');
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initial mock history from your original UI
  const [translations, setTranslations] = useState<Translation[]>([
    {
      id: '1',
      original: "That's so fire! No cap, this dim sum hits different.",
      translated: "That's excellent! I'm being honest, this dim sum is exceptionally good.",
      fromLang: 'gen-z',
      toLang: 'elder-english',
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: '2',
      original: "你吃饱了吗？记得多穿衣服。",
      translated: "Have you eaten? Remember to dress warmly.",
      fromLang: 'mandarin',
      toLang: 'english',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
    }
  ]);

  // --- Refs for Voice Recording ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const languages = [
    { id: 'gen-z', name: 'Gen Z Slang', flag: '🔥' },
    { id: 'elder-english', name: 'Elder English', flag: '📚' },
    { id: 'mandarin', name: 'Mandarin', flag: '🇨🇳' },
    { id: 'hokkien', name: 'Hokkien', flag: '🏮' },
    { id: 'cantonese', name: 'Cantonese', flag: ' dumpling' },
  ];

  // --- Logic: Handle Text Translation ---
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);

    try {
      // 1. Attempt to call the real Gemini Backend
      const res = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          fromLang,
          toLang,
        }),
      });

      if (!res.ok) throw new Error("Backend connection failed");

      const data = await res.json();
      const translated = data.translated || data.translatedText;

      addTranslationToHistory(inputText, translated);
      setInputText("");
    } catch (err) {
      // 2. Fallback: Your original mock logic for Gen Z / Elder English
      let translated = "";
      if (fromLang === "gen-z" && toLang === "elder-english") {
        translated = inputText
          .replace(/fire/gi, "excellent")
          .replace(/no cap/gi, "honestly")
          .replace(/hits different/gi, "is exceptionally good")
          .replace(/slaps/gi, "is wonderful")
          .replace(/bet/gi, "certainly")
          .replace(/fr/gi, "for real")
          .replace(/periodt/gi, "end of discussion");
      } else if (fromLang === "elder-english" && toLang === "gen-z") {
        translated = inputText
          .replace(/excellent/gi, "fire")
          .replace(/honestly/gi, "no cap")
          .replace(/wonderful/gi, "slaps")
          .replace(/certainly/gi, "bet");
      } else {
        translated = `[Offline Mode]: ${inputText}`;
      }

      addTranslationToHistory(inputText, translated);
      setInputText("");
    } finally {
      setIsLoading(false);
    }
  };

  const addTranslationToHistory = (original: string, translatedText: string) => {
    const newTranslation: Translation = {
      id: Date.now().toString(),
      original,
      translated: translatedText,
      fromLang,
      toLang,
      timestamp: new Date(),
    };
    setTranslations((prev) => [newTranslation, ...prev]);
  };

  // --- Logic: Handle Voice Translation ---
  const toggleVoiceInput = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob);

          setIsLoading(true);
          try {
            const response = await fetch('http://localhost:8000/api/translate/voice', {
              method: 'POST',
              body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Voice error');
            
            const newTranslation: Translation = {
              id: Date.now().toString(),
              original: "[Voice Input]",
              translated: data.translated || data.translatedText,
              fromLang: fromLang === 'hokkien' ? 'hokkien' : fromLang,
              toLang: 'english',
              timestamp: new Date()
            };
            setTranslations(prev => [newTranslation, ...prev]);
          } catch (e: any) {
            console.error("Voice translation error:", e);
            // Minimal fallback: populate input area if voice fails
            setInputText("Yo, this family dinner is absolutely bussin!");
          } finally {
            setIsLoading(false);
            stream.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        alert("Microphone access denied.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Section (Original UI) */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Translation Bridge
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Bridge the gap between generations and languages
        </p>
      </div>

      {/* Control Card (Original UI) */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              From
            </label>
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              To
            </label>
            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or speak what you want to translate..."
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTranslate}
            disabled={!inputText.trim() || isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && !isListening ? <Loader2 className="animate-spin w-4 h-4" /> : "🌉 Translate"}
          </button>
          
          <button
            onClick={toggleVoiceInput}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isListening
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 animate-pulse'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
            }`}
          >
            {isListening ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Stop' : 'Voice'}
          </button>

          <button
            onClick={() => {
              const temp = fromLang;
              setFromLang(toLang);
              setToLang(temp);
            }}
            className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {/* History Section (Original UI) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <History className="w-5 h-5 text-zinc-400" /> Recent Activity
        </h2>
        
        {translations.map((translation) => (
          <div
            key={translation.id}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{languages.find(l => l.id === translation.fromLang)?.flag}</span>
              <span>{languages.find(l => l.id === translation.fromLang)?.name}</span>
              <span>→</span>
              <span>{languages.find(l => l.id === translation.toLang)?.flag}</span>
              <span>{languages.find(l => l.id === translation.toLang)?.name}</span>
              <span className="ml-auto text-xs">
                {translation.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  Original
                </div>
                <div className="text-zinc-900 dark:text-zinc-100">
                  {translation.original}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">
                  Translation
                </div>
                <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {translation.translated}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}