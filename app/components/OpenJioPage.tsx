'use client';

import { useState, useEffect } from 'react';

interface JioEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  creator: string;
  participants: string[];
  maxParticipants?: number;
  category: 'meal' | 'activity' | 'errand' | 'other';
}

export default function OpenJioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newJio, setNewJio] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    category: 'meal' as JioEvent['category'],
    maxParticipants: ''
  });

  const [jioEvents, setJioEvents] = useState<JioEvent[]>([
    {
      id: '1',
      title: 'Dim Sum at Chinatown',
      description: 'Anyone free for some har gow and siu mai?',
      date: new Date(2024, 11, 15, 11, 0),
      time: '11:00 AM',
      creator: 'Dad',
      participants: ['Dad', 'Mom', 'Sarah'],
      maxParticipants: 6,
      category: 'meal'
    },
    {
      id: '2',
      title: 'Grocery Run to NTUC',
      description: 'Need to stock up for the week. Car available!',
      date: new Date(2024, 11, 16, 14, 0),
      time: '2:00 PM',
      creator: 'Mom',
      participants: ['Mom'],
      maxParticipants: 4,
      category: 'errand'
    },
    {
      id: '3',
      title: 'Evening Walk at East Coast',
      description: 'Sunset walk and maybe some satay after?',
      date: new Date(2024, 11, 17, 18, 0),
      time: '6:00 PM',
      creator: 'Sarah',
      participants: ['Sarah', 'Brother Mike'],
      category: 'activity'
    }
  ]);

  const categoryIcons = {
    meal: '🍽️',
    activity: '🎯',
    errand: '🛒',
    other: '📝'
  };

  const handleCreateJio = () => {
    if (!newJio.title || !newJio.date || !newJio.time) return;

    const jioDate = new Date(`${newJio.date}T${newJio.time}`);
    const jio: JioEvent = {
      id: Date.now().toString(),
      title: newJio.title,
      description: newJio.description,
      date: jioDate,
      time: jioDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      creator: 'Sarah',
      participants: ['Sarah'],
      maxParticipants: newJio.maxParticipants ? parseInt(newJio.maxParticipants) : undefined,
      category: newJio.category
    };

    setJioEvents(prev => [...prev, jio]);
    setNewJio({
      title: '',
      description: '',
      date: '',
      time: '',
      category: 'meal',
      maxParticipants: ''
    });
    setShowCreateForm(false);
  };

  const handleJoinJio = (jioId: string) => {
    setJioEvents(prev =>
      prev.map(jio =>
        jio.id === jioId && !jio.participants.includes('Sarah')
          ? { ...jio, participants: [...jio.participants, 'Sarah'] }
          : jio
      )
    );
  };

  const handleLeaveJio = (jioId: string) => {
    setJioEvents(prev =>
      prev.map(jio =>
        jio.id === jioId
          ? { ...jio, participants: jio.participants.filter(p => p !== 'Sarah') }
          : jio
      )
    );
  };

  // Close modal on Escape for accessibility
  useEffect(() => {
    if (!showCreateForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreateForm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreateForm]);

  const getUpcomingJios = () => {
    const now = new Date();
    return jioEvents
      .filter(jio => jio.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Open Jio
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Plan and join family activities together
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Create Jio
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Create New Jio
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newJio.title}
                  onChange={(e) => setNewJio(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  placeholder="What's the plan?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newJio.description}
                  onChange={(e) => setNewJio(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none"
                  rows={2}
                  placeholder="Add some details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newJio.date}
                    onChange={(e) => setNewJio(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newJio.time}
                    onChange={(e) => setNewJio(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newJio.category}
                    onChange={(e) => setNewJio(prev => ({ ...prev, category: e.target.value as JioEvent['category'] }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="meal">🍽️ Meal</option>
                    <option value="activity">🎯 Activity</option>
                    <option value="errand">🛒 Errand</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Max People
                  </label>
                  <input
                    type="number"
                    value={newJio.maxParticipants}
                    onChange={(e) => setNewJio(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJio}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Create Jio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Upcoming Jios
        </h2>
        {getUpcomingJios().map((jio) => (
          <div
            key={jio.id}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={
                      `px-2 py-1 rounded-full text-xs font-medium border ` +
                      (jio.category === 'meal'
                        ? 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
                        : jio.category === 'activity'
                        ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                        : jio.category === 'errand'
                        ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300')
                    }
                  >
                    {categoryIcons[jio.category]} {jio.category}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    by {jio.creator}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  {jio.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                  {jio.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>📅 {jio.date.toLocaleDateString()}</span>
                  <span>🕐 {jio.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span>
                    👥 {jio.participants.length}
                    {jio.maxParticipants && `/${jio.maxParticipants}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {jio.participants.includes('Sarah') ? (
                  <button
                    onClick={() => handleLeaveJio(jio.id)}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinJio(jio.id)}
                    disabled={jio.maxParticipants ? jio.participants.length >= jio.maxParticipants : false}
                    className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Participants:
                </span>
                <div className="flex gap-1">
                  {jio.participants.map((participant, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs"
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
