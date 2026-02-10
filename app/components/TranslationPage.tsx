'use client';

import { useState } from 'react';

interface Translation {
  id: string;
  original: string;
  translated: string;
  fromLang: string;
  toLang: string;
  timestamp: Date;
}

export default function TranslationPage() {
  const [inputText, setInputText] = useState('');
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');
  const [isListening, setIsListening] = useState(false);
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

  const languages = [
    { id: 'gen-z', name: 'Gen Z Slang', flag: '🔥' },
    { id: 'elder-english', name: 'Elder English', flag: '📚' },
    { id: 'mandarin', name: 'Mandarin', flag: '🇨🇳' },
    { id: 'hokkien', name: 'Hokkien', flag: '🏮' },
    { id: 'cantonese', name: 'Cantonese', flag: '🥟' },
  ];

  const handleTranslate = () => {
    if (!inputText.trim()) return;

    // Mock translation logic
    let translated = '';
    if (fromLang === 'gen-z' && toLang === 'elder-english') {
      translated = inputText
        .replace(/fire/gi, 'excellent')
        .replace(/no cap/gi, 'honestly')
        .replace(/hits different/gi, 'is exceptionally good')
        .replace(/slaps/gi, 'is wonderful')
        .replace(/bet/gi, 'certainly')
        .replace(/fr/gi, 'for real')
        .replace(/periodt/gi, 'end of discussion');
    } else if (fromLang === 'elder-english' && toLang === 'gen-z') {
      translated = inputText
        .replace(/excellent/gi, 'fire')
        .replace(/honestly/gi, 'no cap')
        .replace(/wonderful/gi, 'slaps')
        .replace(/certainly/gi, 'bet');
    } else {
      translated = `[Translated from ${languages.find(l => l.id === fromLang)?.name} to ${languages.find(l => l.id === toLang)?.name}]: ${inputText}`;
    }

    const newTranslation: Translation = {
      id: Date.now().toString(),
      original: inputText,
      translated,
      fromLang,
      toLang,
      timestamp: new Date()
    };

    setTranslations(prev => [newTranslation, ...prev]);
    setInputText('');
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // Mock voice input
    if (!isListening) {
      setTimeout(() => {
        setInputText("Yo, this family dinner is absolutely bussin!");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Translation Bridge
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Bridge the gap between generations and languages
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              From
            </label>
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTranslate}
            disabled={!inputText.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🌉 Translate
          </button>
          <button
            onClick={toggleVoiceInput}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isListening
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {isListening ? '🔴 Stop' : '🎤 Voice'}
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

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Translations
        </h2>
        {translations.map((translation) => (
          <div
            key={translation.id}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
          >
            <div className="flex items-center gap-2 mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{languages.find(l => l.id === translation.fromLang)?.flag}</span>
              <span>{languages.find(l => l.id === translation.fromLang)?.name}</span>
              <span>→</span>
              <span>{languages.find(l => l.id === translation.toLang)?.flag}</span>
              <span>{languages.find(l => l.id === translation.toLang)?.name}</span>
              <span className="ml-auto">
                {translation.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-3">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Original
                </div>
                <div className="text-zinc-900 dark:text-zinc-100">
                  {translation.original}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Translation
                </div>
                <div className="text-zinc-900 dark:text-zinc-100">
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
