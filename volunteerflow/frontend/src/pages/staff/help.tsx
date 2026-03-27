import React, { useCallback, useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { staffApi, StaffApiError } from '@/lib/staffApi';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpItem {
  id: number;
  type: 'faq' | 'article';
  title: string;
  body: string;
  category: string | null;
  sort_order: number;
  published: boolean;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'faq' | 'article';

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  item?: HelpItem;
  onClose: () => void;
  onSaved: (item: HelpItem) => void;
}

function HelpItemModal({ item, onClose, onSaved }: ModalProps) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    type: item?.type ?? 'faq' as 'faq' | 'article',
    title: item?.title ?? '',
    body: item?.body ?? '',
    category: item?.category ?? '',
    sort_order: item?.sort_order ?? 0,
    published: item?.published ?? false,
    video_url: item?.video_url ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      let result: HelpItem;
      if (isEdit) {
        result = (await staffApi.put(`/help/${item!.id}`, form) as { data: HelpItem }).data;
      } else {
        result = (await staffApi.post('/help', form) as { data: HelpItem }).data;
      }
      onSaved(result);
    } catch (err) {
      setError(err instanceof StaffApiError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Item' : 'New Help Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Type</label>
            <div className="flex gap-3">
              {(['faq', 'article'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === t
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {t === 'faq' ? 'FAQ' : 'Article / Walkthrough'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              {form.type === 'faq' ? 'Question' : 'Title'}
            </label>
            <input
              id="help-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={form.type === 'faq' ? 'How do I invite volunteers?' : 'Setting up your first event'}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              {form.type === 'faq' ? 'Answer' : 'Content'}
            </label>
            <textarea
              id="help-body"
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder={form.type === 'faq' ? 'Go to People and click Invite.' : 'Step-by-step walkthrough...'}
              rows={5}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-vertical"
            />
          </div>

          {/* Category + Sort Order */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Category (optional)</label>
              <input
                id="help-category"
                type="text"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Getting Started"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sort Order</label>
              <input
                id="help-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => set('sort_order', Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Video URL (articles only) */}
          {form.type === 'article' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Video URL <span className="font-normal text-gray-600">(YouTube or Vimeo — optional)</span>
              </label>
              <input
                type="url"
                value={form.video_url}
                onChange={(e) => set('video_url', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Published */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              id="help-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-gray-300">Published (visible to orgs)</span>
          </label>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffHelpPage() {
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [modal, setModal] = useState<{ open: boolean; item?: HelpItem }>({ open: false });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffApi.get('/help') as { data: HelpItem[] };
      setItems(res.data ?? []);
    } catch {
      setError('Failed to load help content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function togglePublished(item: HelpItem) {
    setTogglingId(item.id);
    try {
      const res = await staffApi.put(`/help/${item.id}`, { ...item, published: !item.published }) as { data: HelpItem };
      setItems(prev => prev.map(i => i.id === item.id ? res.data : i));
    } catch {
      // Toggle failed — reload to show true state
      loadItems();
    } finally {
      setTogglingId(null);
    }
  }

  const confirmDelete = async (id: number) => {
    setDeleting(true);
    try {
      await staffApi.delete(`/help/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteId(null);
    } catch {
      setError('Failed to delete item. Please try again.');
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  function onSaved(saved: HelpItem) {
    setItems(prev => {
      const exists = prev.find(i => i.id === saved.id);
      return exists
        ? prev.map(i => i.id === saved.id ? saved : i)
        : [...prev, saved];
    });
    setModal({ open: false });
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  return (
    <StaffLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Help & Documentation</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage FAQs and walkthroughs shown on the org dashboard.</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Item
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-800/50 rounded-xl p-1 w-fit">
          {(['all', 'faq', 'article'] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'faq' ? 'FAQs' : 'Articles'}
              <span className="ml-1.5 text-xs text-gray-500">
                {f === 'all' ? items.length : items.filter(i => i.type === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <p className="text-gray-500 text-sm">No items yet. Click &quot;New Item&quot; to add the first one.</p>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-center">Published</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-center">Order</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-200 font-medium">{item.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.type === 'faq'
                          ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                          : 'bg-purple-900/60 text-purple-300 border border-purple-700'
                      }`}>
                        {item.type === 'faq' ? 'FAQ' : 'Article'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{item.category ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => togglePublished(item)}
                        disabled={togglingId === item.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          item.published ? 'bg-amber-500' : 'bg-gray-700'
                        }`}
                        aria-label={item.published ? 'Unpublish' : 'Publish'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            item.published ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">{item.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ open: true, item })}
                          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal.open && (
        <HelpItemModal
          item={modal.item}
          onClose={() => setModal({ open: false })}
          onSaved={onSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete item?</h3>
            <p className="text-sm text-gray-400 mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deleteId!)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
