interface IdleWarningModalProps {
  isWarning: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
  variant: 'org' | 'staff';
}

export default function IdleWarningModal({
  isWarning,
  secondsLeft,
  onStay,
  onLogout,
  variant,
}: IdleWarningModalProps) {
  if (!isWarning) return null;

  const isStaff = variant === 'staff';

  const cardClass = isStaff
    ? 'bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-8 w-full max-w-sm mx-4'
    : 'bg-white rounded-lg shadow-xl border border-neutral-200 p-8 w-full max-w-sm mx-4';

  const titleClass = isStaff
    ? 'text-lg font-semibold text-amber-400'
    : 'text-lg font-semibold text-neutral-900';

  const bodyClass = isStaff
    ? 'mt-2 text-sm text-gray-300'
    : 'mt-2 text-sm text-neutral-600';

  const primaryBtnClass = isStaff
    ? 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-gray-900 focus:ring-amber-500'
    : 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500';

  const secondaryBtnClass = isStaff
    ? 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
    : 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border-2 border-neutral-300 hover:bg-neutral-50 text-neutral-700 focus:ring-neutral-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={cardClass} role="dialog" aria-modal="true" aria-labelledby="idle-warning-title">
        <h2 id="idle-warning-title" className={titleClass}>
          Are you still there?
        </h2>
        <p className={bodyClass}>
          You'll be logged out in {secondsLeft} seconds due to inactivity.
        </p>
        <div className="mt-6 flex gap-3">
          <button className={primaryBtnClass} onClick={onStay}>
            Stay logged in
          </button>
          <button className={secondaryBtnClass} onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
