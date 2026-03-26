import React from 'react';
import { useSupportView } from '../../context/SupportViewContext';

export function SupportBanner() {
  const { session, isInSupportView, isHydrated, exitSupportView } = useSupportView();
  if (!isHydrated || !isInSupportView || !session) return null;

  const minutesAgo = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg">🛟</span>
        <span>
          SUPPORT VIEW — <strong>{session.orgName}</strong>
          {' '}· Support Mode
          {' '}· Started {minutesAgo}m ago
        </span>
      </div>
      <button
        onClick={exitSupportView}
        className="bg-amber-800 text-white px-3 py-1 rounded text-xs hover:bg-amber-900 transition"
      >
        Exit Support View
      </button>
    </div>
  );
}
