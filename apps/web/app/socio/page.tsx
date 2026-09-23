'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiBookmark, FiMapPin, FiRefreshCw, FiShield } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';
import LoadingState from '@/app/components/LoadingState';

export default function SocioPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (next?: string | null) => {
    setLoading(true);
    apiFetch<any>(`/socio?limit=20${next ? `&cursor=${encodeURIComponent(next)}` : ''}`)
      .then((result) => {
        setPosts(next ? [...posts, ...(result.posts || [])] : result.posts || []);
        setCursor(result.pagination?.nextCursor || null);
      })
      .catch((err) => setError(err.message || 'Socio feed unavailable.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !posts.length) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-8 font-sans text-left">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-3xl bg-[#143527] p-6 text-white sm:p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                <FiShield /> Civique Socio
              </span>
              <h1 className="mt-3 text-3xl font-black text-white">See what your city is solving</h1>
              <p className="mt-2 text-sm text-slate-300 font-medium">
                Public, redacted civic reports shared by residents who opted in.
              </p>
            </div>
            <button
              onClick={() => load()}
              className="rounded-xl border border-white/20 hover:bg-white/10 p-2.5 text-white transition-colors cursor-pointer"
              aria-label="Refresh"
            >
              <FiRefreshCw />
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900">{post.alias}</span>
                <p className="text-[10px] font-semibold text-slate-500">
                  {new Date(post.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <span className="rounded-full bg-[#143527]/10 border border-[#143527]/20 px-2.5 py-0.5 text-[10px] font-black text-[#143527]">
                {post.status}
              </span>
            </div>

            <Link href={`/socio/${post.id}`} className="mt-4 block group">
              <h2 className="text-lg font-black text-slate-900 group-hover:text-[#143527] transition-colors">
                {post.category.replaceAll('_', ' ')}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                {post.text}
              </p>
            </Link>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <FiMapPin className="text-[#143527]" /> Generalized civic location
              </span>
              <span className="inline-flex items-center gap-1">
                <FiBookmark /> Save requires sign-in
              </span>
            </div>
          </article>
        ))}

        {!posts.length && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm font-bold text-slate-500">
            No public posts yet.
          </div>
        )}

        {cursor && (
          <button
            disabled={loading}
            onClick={() => load(cursor)}
            className="w-full rounded-xl border border-[#143527] text-[#143527] hover:bg-[#143527]/5 bg-white px-4 py-3 text-xs font-black transition-colors cursor-pointer"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}

        <p className="text-center text-[10px] font-semibold text-slate-400">
          Every post is explicit opt-in, alias-based, redacted, and separate from the official civic record.
        </p>
      </div>
    </main>
  );
}
