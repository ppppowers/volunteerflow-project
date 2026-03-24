import React from 'react';

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'account',   label: 'Account' },
  { id: 'notes',     label: 'Notes' },
  { id: 'activity',  label: 'Activity' },
  { id: 'billing',   label: 'Billing' },
  { id: 'sessions',  label: 'Sessions' },
] as const;

interface OrgWorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function OrgWorkspaceTabs({ activeTab, onTabChange }: OrgWorkspaceTabsProps) {
  return (
    <div className="flex border-b border-gray-700 overflow-x-auto">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'text-white border-b-2 border-amber-500 -mb-px'
                : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent -mb-px',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
