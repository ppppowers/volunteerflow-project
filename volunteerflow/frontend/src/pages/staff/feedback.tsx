import { useCallback, useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { staffApi } from '@/lib/staffApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackItem {
  id: string;
  org_id: string;
  org_name: string;
  type: 'suggestion' | 'feedback';
  message: string;
  status: 'new' | 'reviewed';
  created_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffApi.get('/feedback') as { data: FeedbackItem[] };
      setItems(res.data ?? []);
    } catch {
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function toggleStatus(item: FeedbackItem) {
    const newStatus = item.status === 'new' ? 'reviewed' : 'new';
    setTogglingId(item.id);
    try {
      await staffApi.patch(`/feedback/${item.id}/status`, { status: newStatus });
      await loadItems();
    } catch {
      // reload to show true state
      await loadItems();
    } finally {
      setTogglingId(null);
    }
  }

  const newCount = items.filter(i => i.status === 'new').length;
  const pageTitle = `Feedback${newCount > 0 ? ` (${newCount} new)` : ''}`;

  return (
    <StaffLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Feedback and suggestions submitted by org users.</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <p className="text-gray-400 text-sm">No feedback submissions yet.</p>
          </div>
        ) : (
          <div className="border border-gray-700 rounded-2xl overflow-hidden bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Org</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const truncated = item.message.length > 100
                    ? item.message.slice(0, 100) + '…'
                    : item.message;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-700 last:border-0 hover:bg-gray-700/40 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="px-4 py-3 text-gray-200 font-medium align-top">
                        {item.org_name || item.org_id}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {item.type === 'suggestion' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300">
                            Suggestion
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300">
                            Feedback
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 align-top">
                        {isExpanded ? item.message : truncated}
                      </td>
                      <td className="px-4 py-3 text-gray-400 align-top whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={togglingId === item.id}
                          onClick={() => toggleStatus(item)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            item.status === 'new'
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-gray-600/40 text-gray-400 hover:bg-gray-600/60'
                          }`}
                        >
                          {item.status === 'new' ? 'New' : 'Reviewed'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
