// Badge color maps
export const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-700 text-gray-300',
  starter: 'bg-blue-900 text-blue-300',
  pro: 'bg-purple-900 text-purple-300',
  enterprise: 'bg-amber-900 text-amber-300',
};

export const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-900 text-green-300',
  suspended: 'bg-red-900 text-red-300',
  trial: 'bg-yellow-900 text-yellow-300',
  cancelled: 'bg-gray-700 text-gray-300',
};

// RecentOrg interface
export interface RecentOrg {
  id: string;
  org_name: string;
  plan: string;
  status: string;
}

// Recent orgs localStorage helpers
export function loadRecentOrgs(): RecentOrg[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('vf_staff_recent_orgs') || '[]');
  } catch {
    return [];
  }
}

// Relative time (full words for table cells)
export function relativeTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

// Compact relative time (for list items)
export function relativeTimeCompact(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
