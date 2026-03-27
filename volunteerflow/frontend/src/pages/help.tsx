import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { BookOpen, HelpCircle, ChevronDown, ChevronUp, Tag, MessageSquare } from 'lucide-react';
import FeedbackModal from '@/components/FeedbackModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpItem {
  id: number;
  type: 'faq' | 'article';
  title: string;
  body: string;
  category: string | null;
  sort_order: number;
  video_url: string | null;
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.slice(1);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function FaqSection({ items }: { items: HelpItem[] }) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const isOpen = openIds.has(item.id);
          return (
            <div
              key={item.id}
              className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${item.id}`}
              >
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 pr-4">
                  {item.title}
                </span>
                <span className="shrink-0 text-neutral-400">
                  {isOpen
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {isOpen && (
                <div id={`faq-panel-${item.id}`} className="px-5 pb-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3 whitespace-pre-wrap">
                  {item.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Article Cards ────────────────────────────────────────────────────────────

function ArticlesSection({ items }: { items: HelpItem[] }) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Walkthroughs & Guides</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const isOpen = openIds.has(item.id);
          return (
            <div
              key={item.id}
              className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-expanded={isOpen}
                aria-controls={`article-panel-${item.id}`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </span>
                  {item.category && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-neutral-400">
                  {isOpen
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {isOpen && (
                <div id={`article-panel-${item.id}`} className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-4">
                  {item.video_url && toEmbedUrl(item.video_url) && (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={toEmbedUrl(item.video_url)!}
                        className="absolute inset-0 w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={item.title}
                      />
                    </div>
                  )}
                  {item.body && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
                      {item.body}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    // api.get already unwraps { success, data } — returns HelpItem[] directly
    api.get<HelpItem[]>('/help')
      .then((items) => setItems(items ?? []))
      .catch(() => setError("Couldn't load help content. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  const faqs = items.filter(i => i.type === 'faq');
  const articles = items.filter(i => i.type === 'article');

  return (
    <Layout>
      <Head><title>Help & Documentation — VolunteerFlow</title></Head>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Help & Documentation
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Guides and answers to help you get the most out of VolunteerFlow.
            </p>
          </div>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <MessageSquare size={14} />
            Feedback
          </button>
        </div>

        {/* States */}
        {loading && (
          <p className="text-sm text-neutral-400">Loading…</p>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400">No help content yet — check back soon.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-10">
            {faqs.length > 0 && <FaqSection items={faqs} />}
            {articles.length > 0 && <ArticlesSection items={articles} />}
          </div>
        )}
      </div>
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </Layout>
  );
}
