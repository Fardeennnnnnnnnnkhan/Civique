'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiHome,
  FiTrendingUp,
  FiMapPin,
  FiBookmark,
  FiUser,
  FiHeart,
  FiMessageCircle,
  FiRepeat,
  FiShare2,
  FiFlag,
  FiCheckCircle,
  FiRefreshCw,
  FiShield,
  FiPaperclip,
  FiTag,
  FiSearch,
  FiArrowRight,
  FiCheck,
  FiPlus,
  FiAlertCircle,
  FiChevronDown,
  FiExternalLink
} from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';
import LoadingState from '@/app/components/LoadingState';
import CitizenHeader from '@/app/components/CitizenHeader';

interface SocioPost {
  id: string;
  reportId: string;
  incidentId: string;
  alias: string;
  text: string;
  latitude: number;
  longitude: number;
  category: string;
  status: string;
  publicationVersion: number;
  createdAt: string;
  supports?: number;
  comments?: number;
  corroborations?: number;
}

interface MyReport {
  id: string;
  incidentId: string;
  publicTrackingId?: string;
  category?: string;
  status?: string;
  description?: string;
  createdAt: string;
  postId?: string | null;
  isPublished: boolean;
}

const CIVIC_CATEGORIES = [
  { id: 'POTHOLE', label: 'Roads & Potholes', tag: '#Pothole' },
  { id: 'WATER_SUPPLY', label: 'Water Supply', tag: '#WaterSupply' },
  { id: 'WASTE_MANAGEMENT', label: 'Waste & Sanitation', tag: '#SwachhIndore' },
  { id: 'STREET_LIGHT', label: 'Streetlighting', tag: '#Streetlight' },
  { id: 'TRAFFIC', label: 'Traffic & Transit', tag: '#TrafficFlow' },
  { id: 'DRAINAGE', label: 'Drainage & Sewage', tag: '#Drainage' },
  { id: 'PARK_MAINTENANCE', label: 'Parks & Greenery', tag: '#CleanParks' },
];

const TRENDING_TOPICS = [
  { tag: '#SwachhIndore', category: 'WASTE_MANAGEMENT', count: '142 updates', headline: 'Ward 8 & 14 zero-waste compliance drive' },
  { tag: '#PotholeDrive', category: 'POTHOLE', count: '89 reports', headline: 'Monsoon bitumen patch work on AB Road' },
  { tag: '#WaterSupply', category: 'WATER_SUPPLY', count: '54 reports', headline: 'Narmada Phase III pipeline maintenance' },
  { tag: '#SmartStreetlights', category: 'STREET_LIGHT', count: '31 updates', headline: 'LED conversion across Zone 4 corridors' },
];

const VERIFIED_OFFICIALS = [
  { name: 'IMC Control Room', handle: '@indore_imc', role: 'Municipal HQ', badge: 'Official Dept' },
  { name: 'Ward 12 Officer', handle: '@ward12_imc', role: 'Vijay Nagar', badge: 'Ward Officer' },
  { name: 'Sanitation Cell', handle: '@imc_swachh', role: 'Solid Waste Mgmt', badge: 'Public Works' },
];

export default function SocioPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<SocioPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'for-you' | 'my-ward' | 'trending' | 'resolved'>('for-you');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Composer State
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [composerText, setComposerText] = useState('');
  const [composerAlias, setComposerAlias] = useState('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState('');

  // Local optimistic state for interactions
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [corroboratedPosts, setCorroboratedPosts] = useState<Record<string, boolean>>({});

  // Load feed posts
  const loadPosts = async (nextCursor?: string | null, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!posts.length) setLoading(true);

    try {
      let url = `/socio?limit=25`;
      if (nextCursor) url += `&cursor=${encodeURIComponent(nextCursor)}`;
      if (selectedTag) {
        const cat = CIVIC_CATEGORIES.find((c) => c.tag === selectedTag);
        if (cat) url += `&category=${encodeURIComponent(cat.id)}`;
      } else if (activeTab === 'resolved') {
        url += `&status=RESOLVED`;
      }

      const result = await apiFetch<any>(url);
      const incoming: SocioPost[] = result.posts || [];

      if (nextCursor) {
        setPosts((prev) => [...prev, ...incoming]);
      } else {
        setPosts(incoming);
      }
      setCursor(result.pagination?.nextCursor || null);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Civique Socio feed is currently unavailable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load user's publishable reports
  const loadMyReports = async () => {
    try {
      const res = await apiFetch<any>('/socio/my-reports');
      if (res.reports) {
        setMyReports(res.reports);
        // Default select first unpublished report if available
        const unpub = res.reports.find((r: MyReport) => !r.isPublished);
        if (unpub) {
          setSelectedReportId(unpub.id);
          setComposerText(unpub.description || '');
        }
      }
    } catch {
      // Citizen might be browsing anonymously or unauthenticated; gracefully ignore
    }
  };

  useEffect(() => {
    loadPosts(null);
    loadMyReports();
  }, [activeTab, selectedTag]);

  // Handle support / like toggle
  const toggleSupport = async (postId: string, currentCount = 0) => {
    const isLiked = Boolean(likedPosts[postId]);
    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, supports: Math.max(0, (p.supports ?? currentCount) + (isLiked ? -1 : 1)) }
          : p
      )
    );

    try {
      await apiFetch(`/socio/posts/${postId}/reactions`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
    } catch (err: any) {
      // Revert on error
      setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
      setFeedbackNotice(err.message || 'Please sign in to support civic posts.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  // Handle Corroborate ("I am also affected")
  const toggleCorroborate = async (postId: string, currentCount = 0) => {
    const isCorroborated = Boolean(corroboratedPosts[postId]);
    setCorroboratedPosts((prev) => ({ ...prev, [postId]: !isCorroborated }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, corroborations: Math.max(0, (p.corroborations ?? currentCount) + (isCorroborated ? -1 : 1)) }
          : p
      )
    );

    try {
      await apiFetch(`/socio/posts/${postId}/corroborations`, {
        method: isCorroborated ? 'DELETE' : 'POST',
      });
      setFeedbackNotice(isCorroborated ? 'Corroboration removed.' : 'Your corroboration was submitted for ward verification.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    } catch (err: any) {
      setCorroboratedPosts((prev) => ({ ...prev, [postId]: isCorroborated }));
      setFeedbackNotice(err.message || 'Unable to corroborate this post.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  // Handle Bookmark / Save
  const toggleSave = async (postId: string) => {
    const isSaved = Boolean(savedPosts[postId]);
    setSavedPosts((prev) => ({ ...prev, [postId]: !isSaved }));

    try {
      await apiFetch(`/socio/posts/${postId}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
      });
      setFeedbackNotice(isSaved ? 'Post removed from bookmarks.' : 'Post saved to bookmarks.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    } catch (err: any) {
      setSavedPosts((prev) => ({ ...prev, [postId]: isSaved }));
      setFeedbackNotice(err.message || 'Sign in to save bookmarks.');
      setTimeout(() => setFeedbackNotice(''), 3000);
    }
  };

  // Handle Share / Copy link
  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/socio/${postId}`;
    navigator.clipboard.writeText(url);
    setFeedbackNotice('Link copied to clipboard!');
    setTimeout(() => setFeedbackNotice(''), 3000);
  };

  // Handle Post Publishing
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) {
      setFeedbackNotice('Please select one of your submitted civic reports to publish.');
      setTimeout(() => setFeedbackNotice(''), 3500);
      setShowAttachModal(true);
      return;
    }

    const alias = (composerAlias || 'Indore Resident').trim();
    if (alias.length < 3) {
      setFeedbackNotice('Please enter a public alias (at least 3 characters).');
      setTimeout(() => setFeedbackNotice(''), 3000);
      return;
    }

    setPublishing(true);
    try {
      await apiFetch('/socio/publish', {
        method: 'POST',
        body: JSON.stringify({
          reportId: selectedReportId,
          consentVersion: 'socio-v1',
          alias: alias,
        }),
      });

      setPublishSuccess(true);
      setComposerText('');
      setSelectedReportId('');
      setFeedbackNotice('Your civic post was published! Municipal admins have been notified.');
      setTimeout(() => {
        setPublishSuccess(false);
        setFeedbackNotice('');
      }, 4000);

      // Refresh feeds and my reports
      loadPosts(null, true);
      loadMyReports();
    } catch (err: any) {
      setFeedbackNotice(err.message || 'Failed to publish post. Report might already be shared.');
      setTimeout(() => setFeedbackNotice(''), 4000);
    } finally {
      setPublishing(false);
    }
  };

  // Filter posts by search query & active tab
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = p.text?.toLowerCase().includes(q);
        const matchAlias = p.alias?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchText && !matchAlias && !matchCat) return false;
      }
      return true;
    });
  }, [posts, searchQuery]);

  // Format relative timestamp
  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
            <FiCheckCircle className="text-emerald-600" /> Resolved
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" /> In Progress
          </span>
        );
      case 'ASSIGNED':
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
            Assigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#143527]/5 border border-[#143527]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#143527]">
            Open
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#143527] selection:text-white">
      {/* Top Citizen Header Bar */}
      <CitizenHeader />

      {/* Floating Feedback Toast */}
      {feedbackNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#143527] px-5 py-3 text-xs font-bold text-white shadow-2xl transition-all animate-bounce">
          <FiShield className="text-emerald-300" /> {feedbackNotice}
        </div>
      )}

      {/* Main Twitter-Style 3-Column Layout Container */}
      <div className="mx-auto flex max-w-7xl justify-center px-2 sm:px-4 lg:px-6">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT NAVIGATION RAIL (Desktop) */}
        {/* ========================================================================= */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-col justify-between py-4 pr-4 lg:flex xl:w-64">
          <div className="space-y-1">
            <div className="mb-4 px-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#143527]/5 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#143527]">
                <FiShield className="text-emerald-700" /> Civic Socio
              </span>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('for-you');
                }}
                className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-black transition-colors ${
                  activeTab === 'for-you' && !selectedTag
                    ? 'bg-[#143527] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FiHome className="text-lg" /> Home Feed
              </button>

              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('trending');
                }}
                className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-black transition-colors ${
                  activeTab === 'trending'
                    ? 'bg-[#143527] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FiTrendingUp className="text-lg" /> Trending
              </button>

              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('my-ward');
                }}
                className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-black transition-colors ${
                  activeTab === 'my-ward'
                    ? 'bg-[#143527] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FiMapPin className="text-lg" /> My Ward
              </button>

              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('resolved');
                }}
                className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-black transition-colors ${
                  activeTab === 'resolved'
                    ? 'bg-[#143527] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FiCheckCircle className="text-lg" /> Resolved Stories
              </button>

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

          {/* User mini badge */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#143527] font-black text-white">
                {composerAlias ? composerAlias[0].toUpperCase() : 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-900">
                  {composerAlias || 'Indore Citizen'}
                </p>
                <p className="truncate text-[10px] font-semibold text-slate-500">
                  @civique_indore
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* COLUMN 2: MAIN TIMELINE (Center Stream) */}
        {/* ========================================================================= */}
        <main className="min-h-screen w-full max-w-2xl border-x border-slate-100 bg-white pb-20">
          
          {/* Sticky Header with Feed Tabs */}
          <header className="sticky top-16 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Socio</h1>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPosts(null, true)}
                  disabled={refreshing}
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Refresh Timeline"
                >
                  <FiRefreshCw className={`text-base ${refreshing ? 'animate-spin text-[#143527]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Twitter-style Tab Switcher */}
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('for-you');
                }}
                className={`relative flex-1 py-3 text-xs font-black transition-colors cursor-pointer ${
                  activeTab === 'for-you' && !selectedTag ? 'text-[#143527]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                For You (Indore)
                {activeTab === 'for-you' && !selectedTag && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-[#143527]" />
                )}
              </button>

              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('my-ward');
                }}
                className={`relative flex-1 py-3 text-xs font-black transition-colors cursor-pointer ${
                  activeTab === 'my-ward' ? 'text-[#143527]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Ward
                {activeTab === 'my-ward' && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-[#143527]" />
                )}
              </button>

              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('trending');
                }}
                className={`relative flex-1 py-3 text-xs font-black transition-colors cursor-pointer ${
                  activeTab === 'trending' ? 'text-[#143527]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Trending
                {activeTab === 'trending' && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-[#143527]" />
                )}
              </button>

              <button
                onClick={() => {
                  setSelectedTag(null);
                  setActiveTab('resolved');
                }}
                className={`relative flex-1 py-3 text-xs font-black transition-colors cursor-pointer ${
                  activeTab === 'resolved' ? 'text-[#143527]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Resolved
                {activeTab === 'resolved' && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-[#143527]" />
                )}
              </button>
            </div>
          </header>

          {/* Active Filter Pill if hashtag is clicked */}
          {selectedTag && (
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">
                Filtering by <strong className="text-[#143527]">{selectedTag}</strong>
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TWITTER-STYLE POST / INCIDENT COMPOSER */}
          {/* ========================================================================= */}
          <section className="border-b border-slate-100 p-4">
            <form onSubmit={handlePublish} className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#143527] font-black text-white text-sm">
                  {composerAlias ? composerAlias[0].toUpperCase() : 'C'}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={composerAlias}
                      onChange={(e) => setComposerAlias(e.target.value)}
                      placeholder="Your Public Alias (e.g. IndoreResident42)"
                      maxLength={30}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-[#143527] focus:bg-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">(Private identity protected)</span>
                  </div>

                  <textarea
                    rows={3}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    maxLength={500}
                    placeholder="What civic problem is happening in your ward? Share an update or select an incident below..."
                    className="w-full resize-none bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-0 leading-relaxed"
                  />

                  {/* Attached Incident Preview Card if selected */}
                  {selectedReportId && (
                    <div className="relative rounded-xl border border-[#143527]/20 bg-[#143527]/5 p-3 text-left">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-[#143527]">
                          <FiPaperclip /> Attached Incident Report
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReportId('');
                            setComposerText('');
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                      {(() => {
                        const rep = myReports.find((r) => r.id === selectedReportId);
                        if (!rep) return null;
                        return (
                          <div className="mt-1">
                            <p className="text-xs font-bold text-slate-900">
                              {rep.category?.replaceAll('_', ' ')} · {rep.publicTrackingId || 'Tracking ID Assigned'}
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">{rep.description}</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Bottom Composer Controls */}
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Attach Report Button */}
                      <button
                        type="button"
                        onClick={() => setShowAttachModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Attach your reported incident"
                      >
                        <FiPaperclip className="text-[#143527]" />
                        {selectedReportId ? 'Change Report' : 'Attach Incident'}
                      </button>

                      {/* Quick Tag Pills */}
                      <div className="hidden sm:flex items-center gap-1">
                        {CIVIC_CATEGORIES.slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (!composerText.includes(c.tag)) {
                                setComposerText((prev) => `${prev} ${c.tag}`.trim());
                              }
                            }}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-[#143527]/10 hover:text-[#143527] transition-colors"
                          >
                            {c.tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">
                        {500 - composerText.length} left
                      </span>
                      <button
                        type="submit"
                        disabled={publishing || (!composerText.trim() && !selectedReportId)}
                        className="rounded-full bg-[#143527] px-5 py-2 text-xs font-black text-white hover:bg-[#0e271c] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {publishing ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* Modal to Select From Citizen's Reports */}
          {showAttachModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Select Incident to Share</h3>
                    <p className="text-xs text-slate-500 font-medium">Choose from your submitted municipal reports to publish on Socio.</p>
                  </div>
                  <button
                    onClick={() => setShowAttachModal(false)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {myReports.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs font-medium text-slate-500">
                      No reports found. Submit an incident via the intake studio first.
                      <div className="mt-3">
                        <Link
                          href="/report"
                          className="rounded-full bg-[#143527] px-4 py-2 text-xs font-bold text-white inline-block"
                        >
                          Create Report
                        </Link>
                      </div>
                    </div>
                  ) : (
                    myReports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedReportId(r.id);
                          if (!composerText) setComposerText(r.description || '');
                          setShowAttachModal(false);
                        }}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                          selectedReportId === r.id
                            ? 'border-[#143527] bg-[#143527]/5 ring-2 ring-[#143527]/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">
                            {r.category?.replaceAll('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {r.publicTrackingId || 'Tracking ID'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2 font-medium">{r.description}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                          {r.isPublished ? (
                            <span className="text-emerald-700 font-black">● Already Published</span>
                          ) : (
                            <span className="text-amber-700 font-black">Ready to Publish</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setShowAttachModal(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FEED LIST (Twitter-style Tweet rows) */}
          {/* ========================================================================= */}
          {loading && !posts.length ? (
            <div className="p-12 flex items-center justify-center">
              <LoadingState />
            </div>
          ) : error ? (
            <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
              {error}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-16 text-center text-sm font-semibold text-slate-400">
              <FiShield className="mx-auto mb-2 text-3xl text-slate-300" />
              No civic posts found for this view.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPosts.map((post) => {
                const isLiked = Boolean(likedPosts[post.id]);
                const isSaved = Boolean(savedPosts[post.id]);
                const isCorroborated = Boolean(corroboratedPosts[post.id]);

                return (
                  <article
                    key={post.id}
                    className="flex gap-3 px-4 py-4 hover:bg-slate-50/70 transition-colors text-left group"
                  >
                    {/* User Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#143527] font-black text-white text-sm shadow-xs">
                      {post.alias ? post.alias[0].toUpperCase() : 'C'}
                    </div>

                    {/* Main Tweet Body */}
                    <div className="min-w-0 flex-1">
                      {/* Author Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-black text-slate-900 group-hover:text-[#143527] transition-colors">
                            {post.alias}
                          </span>
                          <FiCheckCircle className="text-[12px] text-emerald-700" title="Verified Resident Opt-in" />
                          <span className="text-slate-400 font-medium">@{post.alias.toLowerCase().replaceAll(' ', '')}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500 font-medium">{formatRelativeTime(post.createdAt)}</span>
                        </div>

                        {/* Status Badge */}
                        {getStatusBadge(post.status)}
                      </div>

                      {/* Category Tag */}
                      <div className="mt-1">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-[#143527] uppercase tracking-wider">
                          #{post.category.replaceAll('_', '')}
                        </span>
                      </div>

                      {/* Post Text & Content */}
                      <Link href={`/socio/${post.id}`} className="mt-2 block">
                        <p className="text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-line">
                          {post.text}
                        </p>
                      </Link>

                      {/* Generalized Location Pin */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <FiMapPin className="text-[#143527]" />
                        <span>Indore Municipal Corporation (Ward Geofence)</span>
                      </div>

                      {/* ========================================================= */}
                      {/* TWITTER-STYLE INTERACTION ACTION BAR */}
                      {/* ========================================================= */}
                      <div className="mt-3.5 flex max-w-md items-center justify-between text-xs text-slate-500">
                        {/* Comments / Replies */}
                        <Link
                          href={`/socio/${post.id}`}
                          className="flex items-center gap-1.5 hover:text-sky-600 transition-colors"
                        >
                          <FiMessageCircle className="text-sm" />
                          <span className="font-bold text-[11px]">{post.comments || 0}</span>
                        </Link>

                        {/* Corroborate ("I am also affected") */}
                        <button
                          type="button"
                          onClick={() => toggleCorroborate(post.id, post.corroborations)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isCorroborated ? 'text-emerald-700 font-bold' : 'hover:text-emerald-700'
                          }`}
                          title="I am also affected in this area"
                        >
                          <FiRepeat className={`text-sm ${isCorroborated ? 'text-emerald-700' : ''}`} />
                          <span className="font-bold text-[11px]">{post.corroborations || 0}</span>
                        </button>

                        {/* Support / Heart */}
                        <button
                          type="button"
                          onClick={() => toggleSupport(post.id, post.supports)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                          }`}
                          title="Support this civic priority"
                        >
                          <FiHeart className={`text-sm ${isLiked ? 'fill-rose-600 text-rose-600 scale-110' : ''}`} />
                          <span className="font-bold text-[11px]">{post.supports || 0}</span>
                        </button>

                        {/* Bookmark / Save */}
                        <button
                          type="button"
                          onClick={() => toggleSave(post.id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isSaved ? 'text-[#143527] font-bold' : 'hover:text-[#143527]'
                          }`}
                          title="Bookmark"
                        >
                          <FiBookmark className={`text-sm ${isSaved ? 'fill-[#143527] text-[#143527]' : ''}`} />
                        </button>

                        {/* Share */}
                        <button
                          type="button"
                          onClick={() => handleShare(post.id)}
                          className="hover:text-slate-900 transition-colors cursor-pointer"
                          title="Share link"
                        >
                          <FiShare2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {cursor && (
            <div className="p-4 border-t border-slate-100">
              <button
                disabled={loading}
                onClick={() => loadPosts(cursor)}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-black text-[#143527] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {loading ? 'Loading older updates…' : 'Show more posts'}
              </button>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* COLUMN 3: RIGHT SIDEBAR (Search, Trending & Authorities) */}
        {/* ========================================================================= */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 flex-col gap-4 overflow-y-auto py-4 pl-6 xl:flex xl:w-96 text-left">
          
          {/* Twitter-style Search Bar */}
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Civique Socio..."
              className="w-full rounded-full border border-slate-200 bg-slate-100/80 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#143527] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143527]/10"
            />
          </div>

          {/* "What's Happening in Indore" (Trending Civic Hashtags) */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-4 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Trending in Indore</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Live civic issue categories & drives</p>

            <div className="mt-3 divide-y divide-slate-100">
              {TRENDING_TOPICS.map((topic) => (
                <div
                  key={topic.tag}
                  onClick={() => setSelectedTag(topic.tag)}
                  className="cursor-pointer py-2.5 hover:bg-slate-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Civic Drive · Indore</span>
                    <span>{topic.count}</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 hover:text-[#143527]">{topic.tag}</p>
                  <p className="text-[11px] font-medium text-slate-600 line-clamp-1">{topic.headline}</p>
                </div>
              ))}
            </div>
          </div>

          {/* "Civic Authorities & Ward Councillors" */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-4 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Verified Municipal Org</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Official nodal representatives</p>

            <div className="mt-3 space-y-3">
              {VERIFIED_OFFICIALS.map((official) => (
                <div key={official.handle} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-xs font-black text-slate-900">{official.name}</p>
                      <FiShield className="shrink-0 text-[10px] text-[#143527]" />
                    </div>
                    <p className="truncate text-[10px] font-semibold text-slate-500">{official.handle} · {official.role}</p>
                  </div>
                  <span className="rounded-full bg-[#143527]/10 border border-[#143527]/20 px-2.5 py-1 text-[10px] font-black text-[#143527]">
                    {official.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Terms & Guidelines */}
          <div className="px-2 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <Link href="/accountability" className="hover:underline">Accountability</Link>
              <span>·</span>
              <Link href="/map" className="hover:underline">Public Map</Link>
              <span>·</span>
              <Link href="/civic-health" className="hover:underline">Civic Health</Link>
            </div>
            <p className="mt-2 text-[10px]">© 2026 Civique · Indore Municipal Intelligence</p>
          </div>
        </aside>

      </div>
    </div>
  );
}
