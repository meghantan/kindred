'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/library/firebase';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp 
} from 'firebase/firestore';

// --- Icons ---
const Icons = {
  Pencil: () => (
    <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" fill="none">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-12 h-12 stroke-[#CB857C]/50" viewBox="0 0 24 24" strokeWidth="1" fill="none">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  ),
  Heart: ({ filled }: { filled: boolean }) => (
    <svg className={`w-5 h-5 transition-all duration-300 ${filled ? 'fill-[#9C2D41] stroke-[#9C2D41]' : 'fill-none stroke-[#CB857C]'}`} viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  Comment: () => (
    <svg className="w-5 h-5 stroke-[#CB857C] hover:stroke-[#9C2D41] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.379.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" fill="none">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5 stroke-white" viewBox="0 0 24 24" strokeWidth="2" fill="none">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  imageUrl?: string | null;
  prompt?: string | null;
  createdAt: any;
  likes: string[];
  familyId: string;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
}

// Writing Prompts
const WRITING_PROMPTS = [
  "Share a favorite family memory",
  "What made you smile today?",
  "A tradition I want to keep alive",
  "Something I learned recently",
  "Grateful for...",
  "A funny moment from this week",
  "Recipe or food recommendation",
  "Photo from the archives",
];

// --- Comment Component ---
const CommentItem = ({ comment, isAuthor, onDelete }: { comment: Comment, isAuthor: boolean, onDelete: () => void }) => (
  <div className="flex gap-3 group animate-in fade-in slide-in-from-top-1 duration-300">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-[#FAF7F4] text-xs font-semibold shrink-0 shadow-sm">
      {comment.authorName?.[0] || '?'}
    </div>
    <div className="flex-1">
      <div className="bg-[#FAF7F4] rounded-2xl rounded-tl-none px-4 py-2.5 relative border border-[#CB857C]/10">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-xs font-semibold text-[#9C2D41]">{comment.authorName}</span>
          {isAuthor && (
            <button 
              onClick={onDelete} 
              className="text-[10px] uppercase font-semibold text-[#CB857C]/60 hover:text-red-500 transition-colors ml-2"
            >
              Delete
            </button>
          )}
        </div>
        <p className="text-sm text-[#4A4A4A] leading-relaxed break-words">{comment.text}</p>
      </div>
    </div>
  </div>
);

// --- Post Card Component ---
const PostCard = ({ post, currentUserId, currentUserName }: { post: FeedPost, currentUserId: string, currentUserName: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const isAuthor = currentUserId === post.authorId;
  
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUserId) || false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);

  useEffect(() => {
    setIsLiked(post.likes?.includes(currentUserId) || false);
    setLikeCount(post.likes?.length || 0);
  }, [post.likes, currentUserId]);

  useEffect(() => {
    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return () => unsubscribe();
  }, [post.id]);

  const toggleLike = async () => {
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      const postRef = doc(db, 'posts', post.id);
      if (previousLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUserId) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUserId) });
      }
    } catch (error) {
      console.error("Like failed:", error);
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Permanently delete this post?')) return;
    await deleteDoc(doc(db, 'posts', post.id));
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const textToSubmit = newComment;
    setNewComment(''); 

    const tempId = 'temp-' + Date.now();
    const tempComment: Comment = {
      id: tempId,
      authorId: currentUserId,
      authorName: currentUserName || "Me",
      text: textToSubmit,
      createdAt: new Date()
    };
    
    setComments(prev => [...prev, tempComment]);
    if (!showComments) setShowComments(true);

    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        authorId: currentUserId,
        authorName: currentUserName || "Me",
        text: textToSubmit,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error adding comment:", err);
      setComments(prev => prev.filter(c => c.id !== tempId));
      setNewComment(textToSubmit);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-md border-2 border-[#CB857C]/20 overflow-hidden hover:shadow-lg transition-all">
      {/* Post Header */}
      <div className="p-6 pb-3 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-[#FAF7F4] font-semibold shadow-md text-base">
            {post.authorName?.[0] || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-[#9C2D41] text-base leading-tight">{post.authorName}</h3>
            <span className="text-[11px] text-[#CB857C] uppercase tracking-wider font-medium">
              {post.authorRole}
            </span>
          </div>
        </div>
        
        {isAuthor && (
          <button 
            onClick={handleDeletePost} 
            className="text-[#CB857C] hover:text-[#9C2D41] p-2 -mr-2 rounded-full hover:bg-[#FAF7F4] transition-colors"
          >
            <span className="text-xl leading-none font-semibold">•••</span>
          </button>
        )}
      </div>

      {/* Prompt Badge */}
      {post.prompt && (
        <div className="px-6 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#F6CBB7]/30 to-[#CB857C]/20 border border-[#CB857C]/20 rounded-full">
            <Icons.Sparkles />
            <span className="text-xs font-medium text-[#9C2D41]">{post.prompt}</span>
          </div>
        </div>
      )}

      {/* Post Content */}
      <div className="px-6 py-3">
        <p className="text-[#4A4A4A] text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post Image */}
      {post.imageUrl && (
        <div className="mx-6 mt-2 mb-4 rounded-2xl overflow-hidden shadow-sm border-2 border-[#CB857C]/10">
          <img src={post.imageUrl} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      {/* Post Actions */}
      <div className="px-6 py-4 flex items-center justify-between border-t-2 border-[#FAF7F4]">
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLike}
            className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
              isLiked ? 'text-[#9C2D41]' : 'text-[#CB857C] hover:text-[#9C2D41]'
            }`}
          >
            <Icons.Heart filled={isLiked} />
            <span>{likeCount}</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-semibold text-[#CB857C] hover:text-[#9C2D41] transition-colors"
          >
            <Icons.Comment />
            <span>{comments.length}</span>
          </button>
        </div>

        <button className="text-xs text-[#CB857C] hover:text-[#9C2D41] transition-colors font-semibold">
          Translate
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-[#FAF7F4]/30 border-t-2 border-[#CB857C]/10 p-5">
          <div className="space-y-4 mb-4">
            {comments.map(c => (
              <CommentItem 
                key={c.id} 
                comment={c} 
                isAuthor={c.authorId === currentUserId} 
                onDelete={async () => await deleteDoc(doc(db, 'posts', post.id, 'comments', c.id))}
              />
            ))}
            {comments.length === 0 && (
              <p className="text-center text-xs text-[#CB857C] italic py-2">No comments yet.</p>
            )}
          </div>

          <form onSubmit={submitComment} className="flex items-center gap-2 relative">
            <input 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..." 
              className="flex-1 bg-white border-2 border-[#CB857C]/20 rounded-full pl-4 pr-12 py-2.5 text-sm outline-none focus:border-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/20 transition-all text-[#4A4A4A] placeholder-[#CB857C]/50"
            />
            <button 
              type="submit" 
              disabled={!newComment.trim()}
              className="absolute right-1.5 p-2 bg-[#9C2D41] rounded-full text-white hover:bg-[#852233] transition-colors disabled:opacity-50 disabled:bg-[#CB857C] shadow-md"
            >
              <Icons.Send />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Main Page ---
export default function FeedPage() {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userData?.familyId) return;
    
    const q = query(
      collection(db, 'posts'), 
      where('familyId', '==', userData.familyId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost)));
    }, (error) => {
      console.error("Feed Error (Check Indexes):", error);
    });
    return () => unsubscribe();
  }, [userData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert("Please choose an image under 800KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePromptClick = (prompt: string) => {
    setSelectedPrompt(prompt);
    // Auto-focus on textarea would be nice here
  };

  const handleCreatePost = async () => {
  if ((!newPostContent.trim() && !selectedImage) || !user || !userData) return;
  setIsPosting(true);

  try {
    const postContent = newPostContent;
    const postImage = selectedImage;
    
    // 1. Standard Post Creation
    await addDoc(collection(db, 'posts'), {
      authorId: user.uid,
      authorName: userData.name,
      familyId: userData.familyId,
      content: postContent,
      createdAt: serverTimestamp(),
      likes: [],
      imageUrl: postImage,
    });

    // 2. TRIGGER AI ANALYSIS
    const res = await fetch("http://localhost:5001/analyze-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: postContent }),
    });
    
    const { interests } = await res.json();

    // 3. Update User Profile with found interests
    if (interests && interests.length > 0) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        interests: arrayUnion(...interests.map((i: string) => i.toLowerCase()))
      });
    }

    setNewPostContent('');
    setSelectedImage(null);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    setIsPosting(false);
  }
};

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-32">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-normal text-[#9C2D41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Family Feed
          </h1>
          <p className="text-[#CB857C] text-base font-normal">Sharing moments, reducing friction</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Compose Panel (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Create Post Widget */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#CB857C]/20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9C2D41] to-[#CB857C] flex items-center justify-center text-white shrink-0">
                    <Icons.Pencil />
                  </div>
                  <h2 className="text-lg font-medium text-[#9C2D41]" style={{ fontFamily: 'Georgia, serif' }}>
                    Share a Moment
                  </h2>
                </div>

                {/* Selected Prompt Badge */}
                {selectedPrompt && (
                  <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-[#F6CBB7]/30 to-[#CB857C]/20 border border-[#CB857C]/30 rounded-2xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Icons.Sparkles />
                      <span className="text-xs font-medium text-[#9C2D41]">{selectedPrompt}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedPrompt(null)}
                      className="text-[#9C2D41] hover:text-red-500 transition-colors"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                )}

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={`What's on your mind, ${userData?.name?.split(' ')[0]}?`}
                  className="w-full bg-[#FAF7F4] rounded-2xl p-4 border-2 border-[#CB857C]/10 focus:border-[#9C2D41]/30 focus:ring-2 focus:ring-[#9C2D41]/10 outline-none text-[#4A4A4A] placeholder-[#CB857C]/50 text-sm resize-none h-32 transition-all"
                />
                
                {selectedImage && (
                  <div className="relative mt-4 inline-block group">
                    <img src={selectedImage} alt="Preview" className="h-32 w-auto rounded-2xl object-cover border-2 border-[#CB857C]/20 shadow-sm" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-white text-[#9C2D41] rounded-full p-1.5 shadow-md hover:bg-[#FAF7F4] transition-colors border-2 border-[#CB857C]/20"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-[#FAF7F4]">
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-[#FAF7F4] transition-colors text-[#CB857C] hover:text-[#9C2D41] group"
                    >
                      <Icons.Camera />
                      <span className="text-xs font-semibold uppercase tracking-wider">Photo</span>
                    </button>
                  </div>

                  <button 
                    onClick={handleCreatePost}
                    disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                    className="bg-[#9C2D41] text-white px-6 py-2.5 rounded-2xl font-semibold text-sm shadow-lg hover:shadow-xl hover:bg-[#852233] transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {isPosting ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </div>

              {/* Writing Prompts */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#CB857C]/20">
                <div className="flex items-center gap-2 mb-4">
                  <Icons.Sparkles />
                  <h3 className="text-base font-medium text-[#9C2D41]" style={{ fontFamily: 'Georgia, serif' }}>
                    Writing Prompts
                  </h3>
                </div>
                <p className="text-xs text-[#CB857C] mb-4 leading-relaxed">
                  Not sure what to share? Try one of these prompts to spark a story
                </p>
                <div className="flex flex-wrap gap-2">
                  {WRITING_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border-2 ${
                        selectedPrompt === prompt
                          ? 'bg-gradient-to-r from-[#9C2D41] to-[#CB857C] text-white border-transparent shadow-md'
                          : 'bg-[#FAF7F4] text-[#9C2D41] border-[#CB857C]/20 hover:border-[#9C2D41]/40 hover:bg-white'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Feed */}
          <div className="lg:col-span-2 space-y-6">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserId={user?.uid || ''} 
                currentUserName={userData?.name || 'Me'}
              />
            ))}
            
            {posts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-[#CB857C]/20 shadow-md">
                <div className="flex justify-center mb-4">
                  <Icons.Empty />
                </div>
                <p className="text-[#CB857C] text-lg font-normal mb-1">It's quiet here...</p>
                <p className="text-[#9C2D41] font-medium text-sm">Share a memory to start the feed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}