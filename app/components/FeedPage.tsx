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
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-16 h-16 stroke-[#CB857C]/40" viewBox="0 0 24 24" strokeWidth="1" fill="none">
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
  ),
  Trash: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
};

// Available Languages
const LANGUAGES = [
  { id: 'gen-z', name: 'Gen Z Slang', flag: '' },
  { id: 'elder-english', name: 'Elder English', flag: '' },
  { id: 'mandarin', name: 'Mandarin', flag: '' },
  { id: 'hokkien', name: 'Hokkien', flag: '' },
  { id: 'cantonese', name: 'Cantonese', flag: '' },
  { id: 'english', name: 'Standard English', flag: '' },
];

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorPhotoUrl?: string | null;
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
  authorPhotoUrl?: string | null;
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

// --- Reusable Avatar Component ---
const UserAvatar = ({ name, url, size = "w-12 h-12", textClass = "text-lg" }: { name: string, url?: string | null, size?: string, textClass?: string }) => {
  const [imageError, setImageError] = useState(false);
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  return (
    <div className={`${size} rounded-full flex items-center justify-center border-2 border-white shadow-sm relative overflow-hidden shrink-0 bg-gradient-to-br from-[#9C2D41] to-[#CB857C]`}>
      {!imageError && url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <span className={`font-semibold text-[#FAF7F4] ${textClass}`}>{initials}</span>
      )}
    </div>
  );
};

// --- Comment Component ---
const CommentItem = ({ comment, isAuthor, onDelete, photoUrl }: { comment: Comment, isAuthor: boolean, onDelete: () => void, photoUrl?: string | null }) => (
  <div className="flex gap-3 group animate-in fade-in slide-in-from-top-1 duration-300">
    <UserAvatar name={comment.authorName} url={photoUrl} size="w-9 h-9" textClass="text-sm" />
    <div className="flex-1">
      <div className="bg-white/80 rounded-[1.2rem] rounded-tl-none px-4 py-3 relative border border-[#CB857C]/15 shadow-sm">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-semibold text-[#9C2D41]">{comment.authorName}</span>
          {isAuthor && (
            <button 
              onClick={onDelete} 
              className="text-[11px] uppercase font-bold tracking-wide text-[#CB857C]/60 hover:text-red-500 transition-colors ml-2 opacity-0 group-hover:opacity-100"
            >
              Delete
            </button>
          )}
        </div>
        <p className="text-[15px] text-[#4A4A4A] leading-relaxed break-words">{comment.text}</p>
      </div>
    </div>
  </div>
);

// --- Post Card Component ---
const PostCard = ({ 
  post, 
  currentUserId, 
  currentUserName, 
  currentUserPhoto, 
  membersMap, 
  getRelationship 
}: { 
  post: FeedPost; 
  currentUserId: string; 
  currentUserName: string; 
  currentUserPhoto: string | null; 
  membersMap: Record<string, any>; 
  getRelationship: (id: string) => string; 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Translation States
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [showingTranslation, setShowingTranslation] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [fromLang, setFromLang] = useState('gen-z');
  const [toLang, setToLang] = useState('elder-english');

  const isAuthor = currentUserId === post.authorId;
  const authorPhoto = membersMap[post.authorId]?.photoURL || post.authorPhotoUrl;
  const relationship = isAuthor ? "You" : (getRelationship(post.authorId) || post.authorRole);
  
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
      authorPhotoUrl: currentUserPhoto,
      text: textToSubmit,
      createdAt: new Date()
    };
    
    setComments(prev => [...prev, tempComment]);
    if (!showComments) setShowComments(true);

    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        authorId: currentUserId,
        authorName: currentUserName || "Me",
        authorPhotoUrl: currentUserPhoto,
        text: textToSubmit,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error adding comment:", err);
      setComments(prev => prev.filter(c => c.id !== tempId));
      setNewComment(textToSubmit);
    }
  };

  // Translation Function
  const performTranslation = async (sourceLang: string, targetLang: string) => {
    setIsTranslating(true);
    const text = post.content;

    try {
      const res = await fetch("http://localhost:5001/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fromLang: sourceLang, toLang: targetLang }),
      });
      if (!res.ok) throw new Error("API Failed");
      const data = await res.json();
      setTranslatedContent(data.translated);
      setShowingTranslation(true);
    } catch (err) {
      console.log("Using offline fallback translation...");
      let translated = text;

      if (sourceLang === "hokkien") {
        const commonHokkien: { [key: string]: string } = {
          "jiak ba buay": "have you eaten yet",
          "ho bo": "how are you",
          "swee": "beautiful/excellent",
          "sian": "boring/tired",
        };
        const lowerText = text.toLowerCase().trim();
        if (commonHokkien[lowerText]) {
          translated = targetLang === "gen-z" 
            ? `[Gen Z]: ${commonHokkien[lowerText]} fr` 
            : `[Elder English]: ${commonHokkien[lowerText]}?`;
        }
      } else if (sourceLang === "gen-z" && targetLang === "elder-english") {
        translated = text
          .replace(/fire/gi, "excellent")
          .replace(/no cap/gi, "honestly")
          .replace(/slaps/gi, "is wonderful");
      } else if (sourceLang === "elder-english" && targetLang === "gen-z") {
        translated = text
          .replace(/excellent/gi, "fire")
          .replace(/honestly/gi, "no cap")
          .replace(/wonderful/gi, "slaps");
      } else {
        const toName = LANGUAGES.find(l => l.id === targetLang)?.name;
        translated = `[${toName} Translation]: ${text}`;
      }
      
      setTranslatedContent(translated);
      setShowingTranslation(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleTranslate = () => {
    if (showingTranslation) {
      setShowingTranslation(false);
    } else if (translatedContent) {
      // Use cached translation if we already have it
      setShowingTranslation(true);
    } else {
      performTranslation(fromLang, toLang);
    }
  };

  const handleFromLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setFromLang(newLang);
    if (showingTranslation) {
        performTranslation(newLang, toLang);
    } else {
        // Clear cache so next Translate click grabs fresh data
        setTranslatedContent(null);
    }
  };

  const handleToLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setToLang(newLang);
    if (showingTranslation) {
        performTranslation(fromLang, newLang);
    } else {
        // Clear cache so next Translate click grabs fresh data
        setTranslatedContent(null);
    }
  };

  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg border border-[#CB857C]/20 overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Post Header */}
      <div className="p-6 pb-4 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <UserAvatar name={post.authorName} url={authorPhoto} size="w-12 h-12" textClass="text-lg" />
          <div>
            <h3 className="font-normal text-[#9C2D41] text-xl leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              {post.authorName}
            </h3>
            <span className="text-[11px] text-[#CB857C]/80 uppercase tracking-widest font-bold">
              {relationship}
            </span>
          </div>
        </div>
        
        {isAuthor && (
          <button 
            onClick={handleDeletePost} 
            className="text-[#CB857C]/60 hover:text-red-500 p-2 rounded-xl hover:bg-[#FAF7F4] transition-all group"
            title="Delete post"
          >
            <Icons.Trash />
          </button>
        )}
      </div>

      {/* Prompt Badge */}
      {post.prompt && (
        <div className="px-6 pb-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#F6CBB7]/20 to-[#CB857C]/10 border border-[#CB857C]/25 rounded-full shadow-sm">
            <Icons.Sparkles />
            <span className="text-xs font-semibold text-[#9C2D41] tracking-wide">{post.prompt}</span>
          </div>
        </div>
      )}

      {/* Post Content */}
      <div className="px-6 py-2">
        {/* UPDATED: Increased text size from [15px] to [17px] */}
        <p className={`text-[17px] leading-relaxed whitespace-pre-wrap transition-colors ${showingTranslation ? 'text-[#9C2D41] font-medium' : 'text-[#4A4A4A]'}`}>
          {showingTranslation && translatedContent ? translatedContent : post.content}
        </p>
      </div>

      {/* Post Image */}
      {post.imageUrl && (
        <div className="mx-6 mt-4 mb-5 rounded-[1.2rem] overflow-hidden shadow-sm border border-[#CB857C]/15">
          <img src={post.imageUrl} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      {/* Translation Settings (Expands above actions) */}
      {showTranslationSettings && (
        <div className="bg-gradient-to-r from-[#F6CBB7]/15 to-[#FAF7F4] border-t border-[#CB857C]/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-[#9C2D41] uppercase tracking-wider whitespace-nowrap">
              Translate
            </span>
            <div className="flex items-center gap-3 flex-1">
              
              {/* FROM LANG DROPDOWN */}
              <div className="relative flex-1">
                <select 
                  value={fromLang} 
                  onChange={handleFromLangChange}
                  className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-[#CB857C]/20 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/30 transition-all appearance-none shadow-sm text-[13px] font-normal cursor-pointer"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#9C2D41]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <svg className="w-4 h-4 text-[#CB857C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              
              {/* TO LANG DROPDOWN */}
              <div className="relative flex-1">
                <select 
                  value={toLang} 
                  onChange={handleToLangChange}
                  className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-[#CB857C]/20 text-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/30 transition-all appearance-none shadow-sm text-[13px] font-normal cursor-pointer"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#9C2D41]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-[#FAF7F4]">
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLike}
            className={`flex items-center gap-2.5 text-base font-semibold transition-all rounded-xl px-3 py-2 -ml-3 hover:bg-[#FAF7F4] ${
              isLiked ? 'text-[#9C2D41]' : 'text-[#CB857C] hover:text-[#9C2D41]'
            }`}
          >
            <Icons.Heart filled={isLiked} />
            <span>{likeCount}</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2.5 text-base font-semibold text-[#CB857C] hover:text-[#9C2D41] transition-all rounded-xl px-3 py-2 hover:bg-[#FAF7F4]"
          >
            <Icons.Comment />
            <span>{comments.length}</span>
          </button>
        </div>

        {/* Action Right - Translate and Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTranslate}
            disabled={isTranslating}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all border shadow-sm ${
              showingTranslation
                ? 'bg-[#9C2D41] text-white border-[#9C2D41]'
                : 'bg-white text-[#9C2D41] border-[#CB857C]/30 hover:bg-[#FAF7F4]'
            } disabled:opacity-50`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>
              {isTranslating ? 'Translating...' : (showingTranslation ? 'Original' : 'Translate')}
            </span>
          </button>

          {/* ALWAYS show the settings gear icon now */}
          <button
            onClick={() => setShowTranslationSettings(!showTranslationSettings)}
            className={`p-2 rounded-full transition-all border shadow-sm ${
              showTranslationSettings
                ? 'bg-[#F6CBB7]/40 text-[#9C2D41] border-[#CB857C]/30'
                : 'bg-white text-[#CB857C] hover:text-[#9C2D41] border-[#CB857C]/30 hover:bg-[#FAF7F4]'
            }`}
            title="Translation Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-[#FAF7F4]/60 border-t border-[#CB857C]/10 p-6">
          <div className="space-y-4 mb-6">
            {comments.map(c => (
              <CommentItem 
                key={c.id} 
                comment={c} 
                isAuthor={c.authorId === currentUserId} 
                onDelete={async () => await deleteDoc(doc(db, 'posts', post.id, 'comments', c.id))}
                photoUrl={membersMap[c.authorId]?.photoURL || c.authorPhotoUrl}
              />
            ))}
            {comments.length === 0 && (
              <p className="text-center text-sm text-[#CB857C]/70 italic py-3">No comments yet. Be the first!</p>
            )}
          </div>

          <form onSubmit={submitComment} className="flex items-center gap-3 relative">
            <UserAvatar name={currentUserName} url={currentUserPhoto} size="w-8 h-8" textClass="text-xs" />
            <input 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..." 
              className="flex-1 bg-white border border-[#CB857C]/20 rounded-full pl-5 pr-14 py-3 text-[14px] outline-none focus:border-[#9C2D41] focus:ring-2 focus:ring-[#9C2D41]/10 transition-all text-[#4A4A4A] placeholder-[#CB857C]/50 shadow-sm"
            />
            <button 
              type="submit" 
              disabled={!newComment.trim()}
              className="absolute right-2 p-2 bg-[#9C2D41] rounded-full text-white hover:bg-[#852233] transition-all disabled:opacity-40 disabled:bg-[#CB857C] shadow-sm active:scale-95"
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
  const { user, userData, getRelationship } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, any>>({});
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Users Collection for Profile Pics
  useEffect(() => {
    if (!userData?.familyId) return;
    const qUsers = query(collection(db, 'users'), where('familyId', '==', userData.familyId));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setMembersMap(map);
    });
    return () => unsubUsers();
  }, [userData]);

  // Fetch Posts
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
  };

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedImage) || !user || !userData) return;
    setIsPosting(true);

    try {
      const postContent = newPostContent;
      const postImage = selectedImage;
      const postPrompt = selectedPrompt;
      
      setNewPostContent('');
      setSelectedImage(null);
      setSelectedPrompt(null);

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userData.name,
        authorPhotoUrl: userData.photoURL || null,
        authorRole: userData.role || 'Member',
        familyId: userData.familyId,
        content: postContent,
        createdAt: serverTimestamp(),
        likes: [],
        imageUrl: postImage,
        prompt: postPrompt
      });
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-32">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-light tracking-tight text-[#9C2D41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Family Feed
          </h1>
          <p className="text-[#CB857C]/80 text-xl font-light tracking-wide">Sharing moments, reducing friction</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Compose Panel (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Create Post Widget */}
              <div className="bg-white rounded-[1.5rem] p-7 shadow-lg border border-[#CB857C]/20">
                <div className="mb-6">
                  <h2 className="text-2xl font-normal text-[#9C2D41]" style={{ fontFamily: 'Georgia, serif' }}>
                    Share a Moment
                  </h2>
                </div>

                {/* Selected Prompt Badge */}
                {selectedPrompt && (
                  <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-[#F6CBB7]/30 to-[#CB857C]/20 border border-[#CB857C]/30 rounded-2xl px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Icons.Sparkles />
                      <span className="text-sm font-semibold text-[#9C2D41]">{selectedPrompt}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedPrompt(null)}
                      className="text-[#9C2D41] hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-white/50"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                )}

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={`What's on your mind, ${userData?.name?.split(' ')[0] || 'there'}?`}
                  className="w-full bg-[#FAF7F4]/50 rounded-[1.2rem] p-4 border border-[#CB857C]/20 focus:border-[#9C2D41]/40 focus:ring-2 focus:ring-[#9C2D41]/10 outline-none text-[#4A4A4A] placeholder-[#CB857C]/60 text-base leading-relaxed resize-none h-32 transition-all shadow-inner"
                />
                
                {selectedImage && (
                  <div className="relative mt-4 inline-block group">
                    <img src={selectedImage} alt="Preview" className="h-36 w-auto rounded-[1.2rem] object-cover border border-[#CB857C]/20 shadow-md" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-white text-[#9C2D41] rounded-full p-2 shadow-lg hover:bg-[#FAF7F4] transition-all border border-[#CB857C]/20 hover:scale-110 active:scale-95"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-5 pt-5 border-t border-[#FAF7F4]">
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl hover:bg-[#FAF7F4] transition-all text-[#CB857C] hover:text-[#9C2D41] border border-transparent hover:border-[#CB857C]/20"
                    >
                      <Icons.Camera />
                      <span className="text-sm font-bold uppercase tracking-wider">Photo</span>
                    </button>
                  </div>

                  <button 
                    onClick={handleCreatePost}
                    disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                    className="bg-[#9C2D41] text-white px-7 py-2.5 rounded-full font-bold text-[14px] uppercase tracking-wide shadow-md hover:shadow-lg hover:bg-[#852233] transition-all disabled:opacity-40 disabled:shadow-none active:scale-95"
                  >
                    {isPosting ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </div>

              {/* Writing Prompts */}
              <div className="bg-white rounded-[1.5rem] p-7 shadow-lg border border-[#CB857C]/20">
                <div className="flex items-center gap-2.5 mb-4">
                  <Icons.Sparkles />
                  <h3 className="text-xl font-normal text-[#9C2D41]" style={{ fontFamily: 'Georgia, serif' }}>
                    Writing Prompts
                  </h3>
                </div>
                <p className="text-[14px] text-[#CB857C] mb-5 leading-relaxed">
                  Not sure what to share? Try one of these prompts to spark a story.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {WRITING_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all border shadow-sm hover:shadow-md active:scale-95 ${
                        selectedPrompt === prompt
                          ? 'bg-gradient-to-r from-[#9C2D41] to-[#CB857C] text-white border-transparent'
                          : 'bg-[#FAF7F4]/50 text-[#9C2D41] border-[#CB857C]/20 hover:border-[#9C2D41]/40 hover:bg-white'
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
          <div className="lg:col-span-2 space-y-8">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserId={user?.uid || ''} 
                currentUserName={userData?.name || 'Me'}
                currentUserPhoto={userData?.photoURL || null}
                membersMap={membersMap}
                getRelationship={getRelationship}
              />
            ))}
            
            {posts.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[1.5rem] border border-[#CB857C]/20 shadow-lg">
                <div className="flex justify-center mb-6">
                  <Icons.Empty />
                </div>
                <p className="text-[#CB857C] text-xl font-light mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  It's quiet here...
                </p>
                <p className="text-[#9C2D41] font-semibold text-base">Share a memory to start the feed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}