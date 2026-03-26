import { useEffect, useRef, useState } from 'react';
import { CheckCircle, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<'suggestion' | 'feedback'>('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setType('suggestion');
      setMessage('');
      setSubmitting(false);
      setError(null);
      setSubmitted(false);
    }
  }, [isOpen]);

  // Auto-close after submission
  useEffect(() => {
    if (submitted) {
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 2000);
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [submitted, onClose]);

  if (!isOpen) return null;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/feedback', { type, message: message.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const pillBase = 'flex-1 py-1.5 text-sm font-medium rounded-full transition-colors focus:outline-none';
  const pillActive = 'bg-blue-600 text-white';
  const pillInactive = 'border border-neutral-300 text-neutral-600 hover:bg-neutral-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-blue-600 w-5 h-5" />
          <h2 className="text-lg font-semibold text-neutral-900">Share your feedback</h2>
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle className="text-green-500 w-10 h-10 mx-auto mb-3" />
            <p className="text-neutral-700 text-sm">Thanks! We&apos;ve received your feedback.</p>
          </div>
        ) : (
          <>
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                className={`${pillBase} ${type === 'suggestion' ? pillActive : pillInactive}`}
                onClick={() => setType('suggestion')}
                type="button"
              >
                Suggestion
              </button>
              <button
                className={`${pillBase} ${type === 'feedback' ? pillActive : pillInactive}`}
                onClick={() => setType('feedback')}
                type="button"
              >
                Feedback
              </button>
            </div>

            {/* Textarea */}
            <textarea
              rows={4}
              className="w-full mt-4 p-3 border border-neutral-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                type === 'suggestion'
                  ? 'What would make VolunteerFlow better?'
                  : 'Tell us what\'s on your mind'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Error */}
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 text-sm border-2 border-neutral-300 hover:bg-neutral-50 text-neutral-700 focus:ring-neutral-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || message.trim().length < 3}
                className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
