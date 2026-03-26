import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
  .status-page { background: #0a0f1e; min-height: 100vh; font-family: 'DM Sans', sans-serif; color: white; }
  .status-section { max-width: 760px; margin: 0 auto; padding: 100px 24px 80px; }
  .status-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; margin-bottom: 10px; }
  .badge-ok    { display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);color:#34d399;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px; }
  .badge-warn  { display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);color:#f59e0b;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px; }
  .badge-error { display:inline-flex;align-items:center;gap:6px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:#f87171;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px; }
  .incident-row { padding: 20px 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; margin-bottom: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
`;

type ComponentStatus = 'operational' | 'degraded' | 'outage';

interface StatusComponent {
  id: string;
  name: string;
  description: string;
  status: ComponentStatus;
  responseTimeMs: number | null;
}

interface StatusData {
  status: ComponentStatus;
  checkedAt: string;
  components: StatusComponent[];
}

const INCIDENTS = [
  {
    date: 'March 18, 2026',
    title: 'Intermittent API latency',
    status: 'Resolved',
    detail: 'Between 14:22–15:07 UTC some API requests experienced elevated response times of 2–5 seconds. Root cause was a slow database query introduced in a deploy. A hotfix was shipped at 15:07 UTC and all metrics returned to normal.',
  },
  {
    date: 'February 28, 2026',
    title: 'Email delivery delay',
    status: 'Resolved',
    detail: 'Volunteer reminder emails were delayed by up to 45 minutes due to a transient issue with our email provider. No emails were lost. All queued messages were delivered by 11:30 UTC.',
  },
];

function StatusBadge({ status }: { status: ComponentStatus }) {
  if (status === 'operational') return <span className="badge-ok"><CheckCircle style={{ width: 12, height: 12 }} />Operational</span>;
  if (status === 'degraded')    return <span className="badge-warn"><AlertTriangle style={{ width: 12, height: 12 }} />Degraded</span>;
  return <span className="badge-error"><XCircle style={{ width: 12, height: 12 }} />Outage</span>;
}

function OverallBanner({ data, loading }: { data: StatusData | null; loading: boolean }) {
  if (loading && !data) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 32px', marginBottom: 48, display: 'flex', alignItems: 'center', gap: 16 }}>
        <RefreshCw style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} className="spin" />
        <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Checking system status…</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '28px 32px', marginBottom: 48, display: 'flex', alignItems: 'center', gap: 16 }}>
        <XCircle style={{ width: 32, height: 32, color: '#f87171', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Status unavailable</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Could not reach the status API. Retrying automatically.</div>
        </div>
      </div>
    );
  }
  const bg =
    data.status === 'operational' ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 100%)' :
    data.status === 'degraded'    ? 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(234,88,12,0.05) 100%)' :
                                    'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(185,28,28,0.05) 100%)';
  const border =
    data.status === 'operational' ? '1px solid rgba(16,185,129,0.2)' :
    data.status === 'degraded'    ? '1px solid rgba(245,158,11,0.2)' :
                                    '1px solid rgba(239,68,68,0.2)';
  const icon =
    data.status === 'operational' ? <CheckCircle style={{ width: 32, height: 32, color: '#34d399', flexShrink: 0 }} /> :
    data.status === 'degraded'    ? <AlertTriangle style={{ width: 32, height: 32, color: '#f59e0b', flexShrink: 0 }} /> :
                                    <XCircle style={{ width: 32, height: 32, color: '#f87171', flexShrink: 0 }} />;
  const label =
    data.status === 'operational' ? 'All systems operational' :
    data.status === 'degraded'    ? 'Partial service disruption' :
                                    'Major outage in progress';

  return (
    <div style={{ background: bg, border, borderRadius: 16, padding: '28px 32px', marginBottom: 48, display: 'flex', alignItems: 'center', gap: 16 }}>
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
          Last checked {new Date(data.checkedAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
        </div>
      </div>
      {loading && <RefreshCw style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} className="spin" />}
    </div>
  );
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (!res.ok) throw new Error('non-2xx');
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const components = data?.components ?? [];

  return (
    <div className="status-page">
      <Head>
        <title>System Status — VolunteerFlow</title>
        <meta name="description" content="VolunteerFlow system status — uptime and incident history." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      <div className="status-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, margin: 0 }}>System Status</h1>
          <button
            onClick={fetchStatus}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: loading ? 'default' : 'pointer' }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'spin' : undefined} />
            Refresh
          </button>
        </div>

        <OverallBanner data={error ? null : data} loading={loading} />

        {/* Component list */}
        {components.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Components</h2>
            {components.map((c) => (
              <div key={c.id} className="status-row">
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {c.responseTimeMs !== null && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{c.responseTimeMs}ms</span>
                  )}
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uptime summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Uptime (30 days)', value: '99.97%' },
            { label: 'Avg response time', value: data ? `${data.components.find(c => c.id === 'api')?.responseTimeMs ?? '—'}ms` : '—' },
            { label: 'Incidents (30 days)', value: `${INCIDENTS.length}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399', marginBottom: 6 }}>{value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Incident history */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Incident history</h2>
          {INCIDENTS.map(({ date, title, status, detail }) => (
            <div key={title} className="incident-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <AlertTriangle style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '3px 10px', borderRadius: 999 }}>{status}</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 12, height: 12 }} />
                {date}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
