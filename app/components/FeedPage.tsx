'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface FeedPost {
  id: string;
  author: string;
  role: string;
  content: string;
  image?: string;
  timestamp: Date;
  likes: string[];
  comments: Comment[];
  type: 'text' | 'photo' | 'recipe' | 'memory';
  isReported?: boolean;
}

export default function FeedPage() {
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<FeedPost['type']>('text');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<FeedPost[]>([
    {
      id: '1',
      author: 'Grandma Tan',
      role: 'Grandmother',
      content: 'Made my famous pork rib soup today! Sarah, you should come learn this recipe before I forget! 😊',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      likes: ['Sarah'],
      comments: [
        { id: 'c1', author: 'Sarah', content: 'On my way!', timestamp: new Date() }
      ],
      type: 'recipe',
      isReported: false
    }
  ]);

  const slangMap: Record<string, string> = {
    "cooked": "exhausted/in trouble",
    "jio": "invite",
    "no cap": "honestly",
    "slay": "doing great",
    "fr": "for real",
    "juju": "style/energy"
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setPostType('photo');
    }
  };

  const handleCreatePost = () => {
    if (!newPost.trim() && !selectedImage) return;

    const post: FeedPost = {
      id: Date.now().toString(),
      author: 'Sarah Tan',
      role: 'Granddaughter',
      content: newPost,
      image: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
      timestamp: new Date(),
      likes: [],
      comments: [],
      type: postType,
      isReported: false
    };

    setPosts(prev => [post, ...prev]);
    setNewPost('');
    setSelectedImage(null);
    setPostType('text');
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post =>
      post.id === postId
        ? {
            ...post,
            likes: post.likes.includes('Sarah Tan')
              ? post.likes.filter(n => n !== 'Sarah Tan')
              : [...post.likes, 'Sarah Tan']
          }
        : post
    ));
  };

  const handleComment = (postId: string) => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Sarah Tan',
      content: newComment,
      timestamp: new Date()
    };
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, comments: [...post.comments, comment] } : post
    ));
    setNewComment('');
  };

  const translateSlang = (text: string) => {
    let translated = text;
    Object.keys(slangMap).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      translated = translated.replace(regex, `[${slangMap[key]}]`);
    });
    alert(`Elder Translation:\n"${translated}"`);
  };

  const getTimeAgo = (date: Date) => {
    const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 3600000);
    return diff < 1 ? 'Just now' : `${diff}h ago`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">Family Feed</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Reducing friction, restoring kinship.</p>
      </div>

      {/* Create Post */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 p-6 mb-6 shadow-sm">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share a thought or a 'Jio'..."
          className="w-full p-3 border rounded-lg dark:bg-zinc-700 dark:text-white resize-none"
          rows={3}
        />
        
        {selectedImage && (
          <div className="mt-2 text-sm text-blue-600 font-medium italic">
            📸 Image attached: {selectedImage.name}
          </div>
        )}

        <div className="flex justify-between mt-4">
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-zinc-100 rounded">📸</button>
            <button onClick={() => setPostType('recipe')} className="p-2 hover:bg-zinc-100 rounded">👩‍🍳</button>
            <button onClick={() => setPostType('memory')} className="p-2 hover:bg-zinc-100 rounded">💭</button>
          </div>
          <button onClick={handleCreatePost} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Share
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className={`rounded-xl border p-6 shadow-sm ${post.isReported ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-zinc-800'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {post.author[0]}
                </div>
                <div>
                  <div className="font-bold dark:text-white">
                    {post.author} <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full ml-2">{post.role}</span>
                  </div>
                  <div className="text-xs text-zinc-400">{getTimeAgo(post.timestamp)}</div>
                </div>
              </div>
              {post.isReported && <span className="text-red-600 font-bold text-xs uppercase tracking-widest">⚠️ FLAGGED</span>}
            </div>

            <p className="text-zinc-800 dark:text-zinc-200 mb-4">{post.content}</p>
            {post.image && <img src={post.image} alt="Upload" className="rounded-lg mb-4 w-full object-cover max-h-80" />}

            <div className="flex gap-4 border-t pt-4 text-sm font-medium">
              <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1 ${post.likes.includes('Sarah Tan') ? 'text-red-500' : 'text-zinc-500'}`}>
                ❤️ {post.likes.length}
              </button>
              <button onClick={() => setShowComments(showComments === post.id ? null : post.id)} className="text-zinc-500 hover:text-blue-600">
                💬 {post.comments.length}
              </button>
              <button onClick={() => translateSlang(post.content)} className="text-orange-600 hover:underline">👵 Translate for Elders</button>
              <button onClick={() => setPosts(prev => prev.map(p => p.id === post.id ? {...p, isReported: true} : p))} className="ml-auto text-zinc-400 hover:text-red-500">Report</button>
            </div>

            {/* Simple Comment List */}
            {showComments === post.id && (
              <div className="mt-4 space-y-3 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                {post.comments.map(c => (
                  <div key={c.id} className="text-sm">
                    <span className="font-bold mr-2">{c.author}:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{c.content}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                    className="flex-1 p-2 text-xs border rounded dark:bg-zinc-800" 
                    placeholder="Write a comment..." 
                  />
                  <button onClick={() => handleComment(post.id)} className="text-xs bg-blue-600 text-white px-3 rounded">Send</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}