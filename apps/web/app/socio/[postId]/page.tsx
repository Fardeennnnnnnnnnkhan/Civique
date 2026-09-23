'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiMapPin, FiShield, FiHeart, FiMessageCircle, FiFlag, FiUsers } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';
import LoadingState from '@/app/components/LoadingState';

export default function SocioPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    Promise.all([
      apiFetch<any>(`/socio/posts/${postId}`),
      apiFetch<any>(`/socio/posts/${postId}/comments`),
    ])
      .then(([detail, thread]) => {
        setPost(detail);
        setComments(thread.comments || []);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, [postId]);

  const act = async (path: string, options?: RequestInit) => {
    try {
      await apiFetch<any>(path, options);
      setNotice('Your civic contribution was recorded.');
      await load();
    } catch (err: any) {
      setNotice(err.message || 'Sign in to participate.');
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    await act(`/socio/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: comment }),
    });
    setComment('');
  };

  if (!post && !error) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8 font-sans">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  const data = post;
  const item = data.post;

  return (
    <main className="min-h-screen bg-white px-4 py-8 sm:px-8 font-sans text-left text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href="/socio"
          className="inline-flex items-center gap-2 text-xs font-black text-[#143527] hover:underline"
        >
          <FiArrowLeft /> Back to Socio feed
        </Link>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#143527]">
            <FiShield /> Opted-in public post
          </span>
          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-900">{item.alias}</p>
              <p className="text-[10px] font-semibold text-slate-500">
                {new Date(item.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
            <span className="rounded-full bg-[#143527]/10 border border-[#143527]/20 px-3 py-1 text-[10px] font-black text-[#143527]">
              {item.status}
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-black text-slate-900">{item.category.replaceAll('_', ' ')}</h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">{item.text}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">
            <FiMapPin className="text-[#143527]" /> Location generalized for privacy
          </p>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => act(`/socio/posts/${postId}/reactions`, { method: 'POST' })}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-black text-rose-700 transition-colors cursor-pointer"
            >
              <FiHeart /> Support {data.engagement?.supports || 0}
            </button>
            <button
              onClick={() => act(`/socio/posts/${postId}/corroborations`, { method: 'POST' })}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-50 hover:bg-amber-100 px-3 py-2 text-xs font-black text-amber-800 transition-colors cursor-pointer"
            >
              <FiUsers /> I am also affected
            </button>
            <button
              onClick={() => {
                const reason = window.prompt('Why should this post be reviewed?');
                if (reason) act('/socio/content-reports', { method: 'POST', body: JSON.stringify({ postId, reason }) });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition-colors cursor-pointer"
            >
              <FiFlag /> Report
            </button>
          </div>
        </article>

        {data.updates?.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-900">Official updates</h2>
            <div className="mt-4 space-y-3">
              {data.updates.map((update: any) => (
                <div key={update.id} className="border-l-2 border-[#143527] pl-3">
                  <p className="text-xs font-black text-slate-900">{update.status}</p>
                  <p className="text-xs text-slate-600">{update.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{new Date(update.createdAt).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
              <FiMessageCircle className="text-[#143527]" /> Community discussion
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {data.engagement?.comments || comments.length}
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Add a respectful civic comment"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20"
            />
            <button
              onClick={addComment}
              className="rounded-xl bg-[#143527] hover:bg-[#0e271c] px-4 py-2 text-xs font-black text-white transition-colors cursor-pointer"
            >
              Post
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {comments.map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-900">{entry.alias}</p>
                <p className="mt-1 text-sm text-slate-700 font-medium">{entry.body}</p>
              </div>
            ))}
            {!comments.length && (
              <p className="text-xs text-slate-500 py-3 text-center">No comments yet. Keep the conversation constructive.</p>
            )}
          </div>
        </section>

        {notice && <p className="text-center text-xs font-bold text-[#143527]">{notice}</p>}

        <p className="text-center text-[10px] font-semibold text-slate-400">
          Community rules: authenticated aliases only, no harassment or personal details. Moderators can lock or remove content with an appeal path.
        </p>
      </div>
    </main>
  );
}
