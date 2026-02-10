'use client';

import { useState } from 'react';
import Image from 'next/image';

interface FeedPost {
  id: string;
  author: string;
  content: string;
  image?: string;
  timestamp: Date;
  likes: string[];
  comments: Comment[];
  type: 'text' | 'photo' | 'recipe' | 'memory';
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

export default function FeedPage() {
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<FeedPost['type']>('text');
  const [posts, setPosts] = useState<FeedPost[]>([
    {
      id: '1',
      author: 'Grandma Tan',
      content: 'Made my famous pork rib soup today! The secret is to add a bit of dried cuttlefish for that extra umami. Sarah, you should come learn this recipe before I forget! 😊',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      likes: ['Sarah', 'Mom', 'Dad'],
      comments: [
        {
          id: '1',
          author: 'Sarah',
          content: 'Yes please! Can we do this weekend?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60)
        },
        {
          id: '2',
          author: 'Mom',
          content: 'I still remember when you taught me this recipe 30 years ago!',
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        }
      ],
      type: 'recipe'
    },
    {
      id: '2',
      author: 'Dad',
      content: 'Found this old photo from Sarah\'s first day of primary school. Time flies so fast! 📸',
      image: '/placeholder.svg?height=300&width=400',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      likes: ['Sarah', 'Mom', 'Grandma Tan', 'Brother Mike'],
      comments: [
        {
          id: '3',
          author: 'Sarah',
          content: 'OMG I look so tiny! And that backpack was bigger than me 😂',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
        }
      ],
      type: 'memory'
    },
    {
      id: '3',
      author: 'Brother Mike',
      content: 'Just finished my final exams! Thanks everyone for the support and late-night snack deliveries 🙏',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      likes: ['Sarah', 'Mom', 'Dad', 'Grandma Tan'],
      comments: [],
      type: 'text'
    }
  ]);

  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const typeIcons = {
    text: '💬',
    photo: '📸',
    recipe: '👩‍🍳',
    memory: '💭'
  };

  const handleCreatePost = () => {
    if (!newPost.trim()) return;

    const post: FeedPost = {
      id: Date.now().toString(),
      author: 'Sarah',
      content: newPost,
      timestamp: new Date(),
      likes: [],
      comments: [],
      type: postType
    };

    setPosts(prev => [post, ...prev]);
    setNewPost('');
    setPostType('text');
  };

  const handleLike = (postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              likes: post.likes.includes('Sarah')
                ? post.likes.filter(name => name !== 'Sarah')
                : [...post.likes, 'Sarah']
            }
          : post
      )
    );
  };

  const handleComment = (postId: string) => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Sarah',
      content: newComment,
      timestamp: new Date()
    };

    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, comments: [...post.comments, comment] }
          : post
      )
    );

    setNewComment('');
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Family Feed
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Share everyday moments with your loved ones
        </p>
      </div>

      {/* Create Post */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
            ST
          </div>
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">Sarah Tan</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">What's on your mind?</div>
          </div>
        </div>

        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share something with your family..."
          className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none mb-4"
          rows={3}
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {Object.entries(typeIcons).map(([type, icon]) => (
              <button
                key={type}
                onClick={() => setPostType(type as FeedPost['type'])}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  postType === type
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {icon} {type}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreatePost}
            disabled={!newPost.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Share
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {post.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {post.author}
                  </div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {typeIcons[post.type]}
                  </span>
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {getTimeAgo(post.timestamp)}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-zinc-900 dark:text-zinc-100 leading-relaxed">
                {post.content}
              </p>
              {post.image && (
                <div className="mt-3">
                  <Image
                    src={post.image}
                    alt="Post image"
                    width={400}
                    height={300}
                    className="rounded-lg w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  post.likes.includes('Sarah')
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                ❤️ {post.likes.length}
              </button>
              <button
                onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                💬 {post.comments.length}
              </button>
            </div>

            {showComments === post.id && (
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <div className="space-y-3 mb-4">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {comment.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 py-2">
                          <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                            {comment.author}
                          </div>
                          <div className="text-zinc-700 dark:text-zinc-300">
                            {comment.content}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {getTimeAgo(comment.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    ST
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={!newComment.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
