'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiMapPin,
  FiShield,
  FiHeart,
  FiMessageCircle,
  FiRepeat,
  FiShare2,
  FiBookmark,
  FiFlag,
  FiCheckCircle,
  FiUser,
  FiHome,
  FiTrendingUp,
  FiSearch,
  FiPlus,
  FiAlertCircle
} from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';
import LoadingState from '@/app/components/LoadingState';
import CitizenHeader from '@/app/components/CitizenHeader';

const TRENDING_TOPICS = [
  { tag: '#SwachhIndore', count: '142 updates', headline: 'Ward 8 & 14 zero-waste compliance drive' },
  { tag: '#PotholeDrive', count: '89 reports', headline: 'Monsoon bitumen patch work on AB Road' },
  { tag: '#WaterSupply', count: '54 reports', headline: 'Narmada Phase III pipeline maintenance' },
];

export default function SocioPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();
  const [postData, setPostData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');

  // Local optimistic state
  const [isLiked, setIsLiked] = useState(false);
  const [isCorroborated, setIsCorroborated] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [supportsCount, setSupportsCount] = useState(0);
  const [corroborationsCount, setCorroborationsCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [detail, thread] = await Promise.all([
        apiFetch<any>(`/socio/posts/${postId}`),
        apiFetch<any>(`/socio/posts/${postId}/comments`),
      ]);
      setPostData(detail);
      setComments(thread.comments || []);
      setSupportsCount(detail.engagement?.supports || 0);
      setCorroborationsCount(detail.engagement?.corroborations || 0);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Post not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const toggleSupport = async () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setSupportsCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      await apiFetch(`/socio/posts/${postId}/reactions`, {
        method: nextState ? 'POST' : 'DELETE',
      });
    } catch (err: any) {
      setIsLiked(!nextState);
      setSupportsCount((prev) => Math.max(0, prev + (!nextState ? 1 : -1)));
      setFeedbackNotice(err.message || 'Please sign in to support this post.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  const toggleCorroborate = async () => {
    const nextState = !isCorroborated;
    setIsCorroborated(nextState);
    setCorroborationsCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      await apiFetch(`/socio/posts/${postId}/corroborations`, {
        method: nextState ? 'POST' : 'DELETE',
      });
      setFeedbackNotice(nextState ? 'Corroboration submitted for ward verification.' : 'Corroboration removed.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    } catch (err: any) {
      setIsCorroborated(!nextState);
      setCorroborationsCount((prev) => Math.max(0, prev + (!nextState ? 1 : -1)));
      setFeedbackNotice(err.message || 'Unable to corroborate this post.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  const toggleSave = async () => {
    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      await apiFetch(`/socio/posts/${postId}/save`, {
        method: nextState ? 'POST' : 'DELETE',
      });
      setFeedbackNotice(nextState ? 'Post bookmarked.' : 'Bookmark removed.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    } catch (err: any) {
      setIsSaved(!nextState);
      setFeedbackNotice(err.message || 'Sign in to save bookmarks.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setFeedbackNotice('Link copied to clipboard!');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await apiFetch<any>(`/socio/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (res.comment) {
        setComments((prev) => [...prev, res.comment]);
        setReplyText('');
        setFeedbackNotice('Your reply was posted.');
        setTimeout(() => setFeedbackNotice(''), 3000);
      }
    } catch (err: any) {
      setFeedbackNotice(err.message || 'Failed to post reply. Sign in to comment.');
      setTimeout(() => setFeedbackNotice(''), 3500);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReportContent = async () => {
    const reason = window.prompt('Why should this post be reviewed by municipal moderators?');
    if (!reason || reason.trim().length < 5) return;

    try {
      await apiFetch('/socio/content-reports', {
        method: 'POST',
        body: JSON.stringify({ postId, reason: reason.trim() }),
      });
      setFeedbackNotice('Report submitted to moderation.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    } catch (err: any) {
      setFeedbackNotice(err.message || 'Failed to submit report.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <CitizenHeader />
        <div className="flex h-96 items-center justify-center">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error || !postData?.post) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <CitizenHeader />
        <div className="mx-auto max-w-xl p-8 text-left">
          <Link
            href="/socio"
            className="inline-flex items-center gap-2 text-xs font-black text-[#143527] hover:underline"
          >
            <FiArrowLeft /> Back to Socio Feed
          </Link>
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
            {error || 'Post not found.'}
          </div>
        </div>
      </div>
    );
  }

  const post = postData.post;
  const updates = postData.updates || [];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#143527] selection:text-white">
      <CitizenHeader />

      {/* Floating Feedback Toast */}
      {feedbackNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#143527] px-5 py-3 text-xs font-bold text-white shadow-2xl transition-all animate-bounce">
          <FiShield className="text-emerald-300" /> {feedbackNotice}
        </div>
      )}

      {/* 3-Column Container */}
      <div className="mx-auto flex max-w-7xl justify-center px-2 sm:px-4 lg:px-6">
        
        {/* Left Navigation Sidebar (Desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-col justify-between py-4 pr-4 lg:flex xl:w-64">
          <div className="space-y-1">
            <div className="mb-4 px-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#143527]/5 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#143527]">
                <FiShield className="text-emerald-700" /> Civic Socio
              </span>
            </div>

            <nav className="space-y-1">
              <Link
                href="/socio"
                className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FiHome className="text-lg" /> Home Feed
              </Link>
              <Link
                href="/socio"
                className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FiTrendingUp className="text-lg" /> Trending
              </Link>
              <Link
                href="/profile"
                className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FiUser className="text-lg" /> Citizen Profile
              </Link>
            </nav>

            <div className="pt-4">
              <Link
                href="/report"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#143527] py-3.5 text-sm font-black text-white shadow-md hover:bg-[#0e271c] transition-all cursor-pointer"
              >
                <FiPlus className="text-lg" /> Report New Issue
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#143527] font-black text-white">
                {post.alias ? post.alias[0].toUpperCase() : 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-900">
                  {post.alias}
                </p>
                <p className="truncate text-[10px] font-semibold text-slate-500">
                  @civique_indore
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Post Thread Column */}
        <main className="min-h-screen w-full max-w-2xl border-x border-slate-100 bg-white pb-20 text-left">
          
          {/* Top Back Header */}
          <header className="sticky top-16 z-30 flex items-center gap-4 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-md">
            <Link
              href="/socio"
              className="rounded-full p-2 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Back to feed"
            >
              <FiArrowLeft className="text-lg" />
            </Link>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight">Civic Post</h1>
              <p className="text-[10px] font-semibold text-slate-500">Indore Municipal Corporation</p>
            </div>
          </header>

          {/* Large Main Tweet / Post Article */}
          <article className="border-b border-slate-100 p-5">
            {/* Author Profile Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#143527] font-black text-white text-base shadow-xs">
                  {post.alias ? post.alias[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-sm">{post.alias}</span>
                    <FiCheckCircle className="text-xs text-emerald-700" title="Verified Opt-in Citizen" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">@{post.alias.toLowerCase().replaceAll(' ', '')}</p>
                </div>
              </div>

              <span className="rounded-full bg-[#143527]/10 border border-[#143527]/20 px-3 py-1 text-[11px] font-black text-[#143527]">
                {post.status}
              </span>
            </div>

            {/* Category Tag */}
            <div className="mt-3">
              <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-[#143527] uppercase tracking-wider">
                #{post.category.replaceAll('_', ' ')}
              </span>
            </div>

            {/* Post Main Body Text */}
            <p className="mt-3 text-base font-medium leading-relaxed text-slate-800 whitespace-pre-line">
              {post.text}
            </p>

            {/* Generalized Location Badge */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs font-semibold text-slate-600">
              <FiMapPin className="text-[#143527]" />
              <span>Indore Ward Geofence · Precise location protected for citizen privacy</span>
            </div>

            {/* Date & Time Metadata */}
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-400">
              <span>{new Date(post.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="mx-1">·</span>
              <span>{new Date(post.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Engagement Counts Bar */}
            <div className="mt-3 flex gap-6 border-t border-slate-100 py-3 text-xs">
              <div>
                <strong className="font-black text-slate-900">{supportsCount}</strong>{' '}
                <span className="text-slate-500">Supports</span>
              </div>
              <div>
                <strong className="font-black text-slate-900">{corroborationsCount}</strong>{' '}
                <span className="text-slate-500">Affected</span>
              </div>
              <div>
                <strong className="font-black text-slate-900">{comments.length}</strong>{' '}
                <span className="text-slate-500">Replies</span>
              </div>
            </div>

            {/* Interactive Action Bar */}
            <div className="flex items-center justify-around border-t border-slate-100 pt-3 text-slate-500 text-sm">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('reply-textarea');
                  el?.focus();
                }}
                className="flex items-center gap-1.5 hover:text-sky-600 transition-colors cursor-pointer"
                title="Reply"
              >
                <FiMessageCircle />
              </button>

              <button
                type="button"
                onClick={toggleCorroborate}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isCorroborated ? 'text-emerald-700 font-bold' : 'hover:text-emerald-700'
                }`}
                title="I am also affected"
              >
                <FiRepeat className={isCorroborated ? 'text-emerald-700' : ''} />
              </button>

              <button
                type="button"
                onClick={toggleSupport}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                }`}
                title="Support"
              >
                <FiHeart className={isLiked ? 'fill-rose-600 text-rose-600 scale-110' : ''} />
              </button>

              <button
                type="button"
                onClick={toggleSave}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSaved ? 'text-[#143527] font-bold' : 'hover:text-[#143527]'
                }`}
                title="Bookmark"
              >
                <FiBookmark className={isSaved ? 'fill-[#143527] text-[#143527]' : ''} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="hover:text-slate-900 transition-colors cursor-pointer"
                title="Share"
              >
                <FiShare2 />
              </button>

              <button
                type="button"
                onClick={handleReportContent}
                className="hover:text-rose-600 transition-colors cursor-pointer"
                title="Report Post"
              >
                <FiFlag />
              </button>
            </div>
          </article>

          {/* Official Municipal Updates Timeline (if any) */}
          {updates.length > 0 && (
            <section className="border-b border-slate-100 bg-[#143527]/5 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-[#143527] uppercase tracking-wider">
                <FiShield /> Official Municipal Updates
              </div>
              <div className="mt-3 space-y-3">
                {updates.map((u: any) => (
                  <div key={u.id} className="rounded-xl border border-[#143527]/20 bg-white p-3 text-xs shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#143527]">{u.status}</span>
                      <span className="text-[10px] text-slate-400">{new Date(u.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="mt-1 text-slate-700 font-medium">{u.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reply Composer Bar */}
          <section className="border-b border-slate-100 p-4">
            <form onSubmit={submitReply} className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#143527] font-black text-white text-sm">
                C
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <textarea
                  id="reply-textarea"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={500}
                  placeholder="Post your reply (keep discussion civic and constructive)..."
                  className="w-full resize-none bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">{500 - replyText.length} left</span>
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="rounded-full bg-[#143527] px-4 py-1.5 text-xs font-black text-white hover:bg-[#0e271c] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {submittingReply ? 'Replying…' : 'Reply'}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Threaded Comments List */}
          <section className="divide-y divide-slate-100">
            {comments.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                No replies yet. Be the first to share constructive civic context.
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 font-black text-slate-700 text-xs">
                    {c.alias ? c.alias[0].toUpperCase() : 'R'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{c.alias}</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(c.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-700">{c.body}</p>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>

        {/* Right Sidebar (Desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 flex-col gap-4 overflow-y-auto py-4 pl-6 xl:flex xl:w-96 text-left">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-4 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Trending in Indore</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {TRENDING_TOPICS.map((t) => (
                <Link key={t.tag} href="/socio" className="block py-2.5 hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Civic Drive</span>
                    <span>{t.count}</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 hover:text-[#143527]">{t.tag}</p>
                  <p className="text-[11px] font-medium text-slate-600 line-clamp-1">{t.headline}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
