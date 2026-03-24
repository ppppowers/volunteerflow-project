import React, { useState } from 'react';
import { staffApi } from '@/lib/staffApi';

interface NoteEditorProps {
  orgId: string;
  existingNote?: {
    id: string;
    content: string;
    is_important: boolean;
    tags: string[];
  };
  onSave: (note: unknown) => void;
  onCancel: () => void;
}

export function NoteEditor({ orgId, existingNote, onSave, onCancel }: NoteEditorProps) {
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [isImportant, setIsImportant] = useState(existingNote?.is_important ?? false);
  const [tagsInput, setTagsInput] = useState(existingNote?.tags.join(', ') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!existingNote;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('Note content is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = { content: trimmedContent, is_important: isImportant, tags };

    setLoading(true);
    setError('');
    try {
      let result: unknown;
      if (isEdit) {
        result = await staffApi.patch(`/orgs/${orgId}/notes/${existingNote.id}`, payload);
      } else {
        result = await staffApi.post(`/orgs/${orgId}/notes`, payload);
      }
      onSave((result as { note: unknown }).note);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save note.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200">
        {isEdit ? 'Edit Note' : 'New Note'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Content */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Content <span className="text-red-400">*</span>
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            placeholder="Write your note here…"
            className="w-full bg-gray-900 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700 resize-y"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="e.g. billing, onboarding, followup"
            className="w-full bg-gray-900 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
          />
        </div>

        {/* Important toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={e => setIsImportant(e.target.checked)}
            className="rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-gray-300">Mark as important</span>
        </label>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Note'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-sm px-4 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
