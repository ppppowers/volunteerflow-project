import { useState, useRef } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { PlanGate } from '@/components/PlanGate';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VolunteerRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  total_hours: number;
  events_attended: number;
  sessions: { event: string; category: string; date: string; hours: number }[];
}

interface CategoryRow {
  category: string;
  total_hours: number;
  volunteers: number;
}

interface ReportData {
  org: {
    org_name: string;
    logo_url: string;
    logo_base64: string;
    address: string;
    org_email: string;
    phone: string;
    tax_id: string;
  };
  summary: {
    total_hours: string;
    unique_volunteers: string;
    total_sessions: string;
  };
  by_volunteer: VolunteerRow[];
  by_category: CategoryRow[];
  generated_at: string;
  date_range: { from: string | null; to: string | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(hours: string | number) {
  return Number(hours).toFixed(1);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
}

// ─── Printable Report ─────────────────────────────────────────────────────────

function PrintReport({ data }: { data: ReportData }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const logoSrc = data.org.logo_base64 || data.org.logo_url || null;
  const totalHours = fmt(data.summary.total_hours ?? 0);
  const rangeFrom  = fmtDate(data.date_range.from);
  const rangeTo    = fmtDate(data.date_range.to);

  return (
    <div id="grant-report-print" className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden print:border-0 print:shadow-none print:rounded-none">

      {/* ── Report header ── */}
      <div className="px-10 pt-10 pb-8 border-b border-neutral-200 dark:border-neutral-700 print:border-neutral-300">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            {logoSrc && (
              <img src={logoSrc} alt="Logo" className="w-14 h-14 object-contain rounded-lg flex-shrink-0" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 print:text-black">
                {data.org.org_name || 'Organization'}
              </h1>
              <p className="text-sm text-neutral-500 print:text-neutral-600 mt-0.5">Volunteer Hours Report</p>
              {data.org.tax_id && (
                <p className="text-xs text-neutral-400 print:text-neutral-500 mt-0.5">EIN / Tax ID: {data.org.tax_id}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-neutral-500 print:text-neutral-600 flex-shrink-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 print:text-black">Reporting Period</p>
            <p>{rangeFrom} – {rangeTo}</p>
            <p className="text-xs mt-2">Generated {fmtTs(data.generated_at)}</p>
          </div>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-700 print:divide-neutral-300">
        {[
          { label: 'Total Confirmed Hours', value: totalHours, sub: 'hours contributed' },
          { label: 'Unique Volunteers',     value: data.summary.unique_volunteers ?? '0', sub: 'individual contributors' },
          { label: 'Service Sessions',      value: data.summary.total_sessions ?? '0',    sub: 'logged sessions' },
        ].map((s) => (
          <div key={s.label} className="px-8 py-6 text-center">
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 print:text-black">{s.value}</p>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 print:text-neutral-800 mt-1">{s.label}</p>
            <p className="text-xs text-neutral-400 print:text-neutral-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Hours by program/category ── */}
      {data.by_category.length > 0 && (
        <div className="px-10 py-8 border-t border-neutral-200 dark:border-neutral-700 print:border-neutral-300">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 print:text-black mb-4">
            Hours by Program / Category
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 print:border-neutral-300">
                <th className="pb-2 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Program</th>
                <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Hours</th>
                <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Volunteers</th>
                <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.by_category.map((cat) => {
                const pct = data.summary.total_hours ? ((Number(cat.total_hours) / Number(data.summary.total_hours)) * 100).toFixed(1) : '0';
                return (
                  <tr key={cat.category} className="border-b border-neutral-50 dark:border-neutral-800 print:border-neutral-200">
                    <td className="py-3 font-medium text-neutral-900 dark:text-neutral-100 print:text-black capitalize">{cat.category}</td>
                    <td className="py-3 text-right font-bold text-neutral-900 dark:text-neutral-100 print:text-black">{fmt(cat.total_hours)}h</td>
                    <td className="py-3 text-right text-neutral-600 dark:text-neutral-300 print:text-neutral-700">{cat.volunteers}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-neutral-100 dark:bg-neutral-700 print:bg-neutral-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-neutral-500 print:text-neutral-600 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-300 dark:border-neutral-600 print:border-neutral-400">
                <td className="pt-3 font-bold text-neutral-900 dark:text-neutral-100 print:text-black">Total</td>
                <td className="pt-3 text-right font-bold text-neutral-900 dark:text-neutral-100 print:text-black">{totalHours}h</td>
                <td className="pt-3 text-right font-bold text-neutral-600 dark:text-neutral-300 print:text-neutral-700">{data.summary.unique_volunteers}</td>
                <td className="pt-3 text-right text-xs text-neutral-400">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Volunteer detail table ── */}
      <div className="px-10 py-8 border-t border-neutral-200 dark:border-neutral-700 print:border-neutral-300">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 print:text-black mb-4">
          Volunteer Contribution Detail
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 print:border-neutral-300">
              <th className="pb-2 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Volunteer</th>
              <th className="pb-2 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500 hidden print:table-cell">Email</th>
              <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Total Hours</th>
              <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Sessions</th>
              <th className="pb-2 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {data.by_volunteer.map((vol) => (
              <>
                <tr
                  key={vol.id}
                  className="border-b border-neutral-50 dark:border-neutral-800 print:border-neutral-200 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 print:cursor-default print:hover:bg-transparent"
                  onClick={() => toggle(vol.id)}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {vol.avatar ? (
                        <img src={vol.avatar} alt={vol.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 print:hidden" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 print:hidden">
                          <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400">
                            {vol.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 print:text-black">{vol.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-neutral-500 print:text-neutral-600 hidden print:table-cell text-xs">{vol.email}</td>
                  <td className="py-3 text-right font-bold text-neutral-900 dark:text-neutral-100 print:text-black">{fmt(vol.total_hours)}h</td>
                  <td className="py-3 text-right text-neutral-500 dark:text-neutral-400 print:text-neutral-600">{vol.events_attended}</td>
                  <td className="py-3 print:hidden">
                    <div className="flex justify-end text-neutral-400">
                      {expanded[vol.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </td>
                </tr>
                {/* Session breakdown — shown on expand (screen) or always (print) */}
                {(expanded[vol.id]) && (
                  <tr key={`${vol.id}-sessions`} className="print:hidden">
                    <td colSpan={5} className="pb-3 px-0">
                      <div className="ml-10 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                              <th className="px-4 py-2 text-left font-semibold text-neutral-500">Event</th>
                              <th className="px-4 py-2 text-left font-semibold text-neutral-500">Category</th>
                              <th className="px-4 py-2 text-left font-semibold text-neutral-500">Date</th>
                              <th className="px-4 py-2 text-right font-semibold text-neutral-500">Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vol.sessions?.map((s, i) => (
                              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-700/50">
                                <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{s.event ?? '—'}</td>
                                <td className="px-4 py-2 text-neutral-500 capitalize">{s.category ?? 'Uncategorized'}</td>
                                <td className="px-4 py-2 text-neutral-500">{s.date?.slice(0, 10)}</td>
                                <td className="px-4 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">{Number(s.hours).toFixed(1)}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="px-10 py-6 border-t border-neutral-200 dark:border-neutral-700 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/30 print:bg-white">
        <p className="text-xs text-neutral-400 print:text-neutral-500 text-center">
          This report certifies volunteer service hours recorded in VolunteerFlow.
          {data.org.org_name && ` All hours were contributed to ${data.org.org_name}.`}
          {data.org.address && ` Address: ${data.org.address}.`}
          {data.org.tax_id && ` EIN: ${data.org.tax_id}.`}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const THIS_YEAR_START = `${new Date().getFullYear()}-01-01`;
const TODAY           = new Date().toISOString().slice(0, 10);

export default function GrantReportPage() {
  const [from, setFrom]       = useState(THIS_YEAR_START);
  const [to, setTo]           = useState(TODAY);
  const [loading, setLoading] = useState(false);
  const [report, setReport]   = useState<ReportData | null>(null);
  const [error, setError]     = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to', to);
      const data = await api.get<ReportData>(`/hours/report?${params.toString()}`);
      setReport(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => window.print();

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Volunteer', 'Email', 'Total Hours', 'Sessions', 'Event', 'Category', 'Date', 'Session Hours'],
      ...report.by_volunteer.flatMap((v) =>
        (v.sessions ?? []).map((s) => [
          v.name, v.email, fmt(v.total_hours), String(v.events_attended),
          s.event ?? '', s.category ?? '', s.date?.slice(0, 10) ?? '', String(s.hours),
        ])
      ),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `grant-report-${from}-to-${to}.csv`;
    a.click();
  };

  return (
    <Layout>
      <Head><title>Grant Report — VolunteerFlow</title></Head>
      <PlanGate feature="hours_tracking">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Grant Hour Report</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Generate a printable volunteer hours report for grant funders, compliance, or internal records.
            </p>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={exportCsv} className="flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Button onClick={printReport} className="flex items-center gap-2 text-sm">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </Button>
            </div>
          )}
        </div>

        {/* Date range picker */}
        <Card className="mb-6 print:hidden">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">From date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">To date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Quick range presets */}
              {[
                { label: 'This year',  from: `${new Date().getFullYear()}-01-01`,                                to: TODAY },
                { label: 'Last year', from: `${new Date().getFullYear() - 1}-01-01`,                            to: `${new Date().getFullYear() - 1}-12-31` },
                { label: 'Q1',        from: `${new Date().getFullYear()}-01-01`,                                to: `${new Date().getFullYear()}-03-31` },
                { label: 'Q2',        from: `${new Date().getFullYear()}-04-01`,                                to: `${new Date().getFullYear()}-06-30` },
                { label: 'Q3',        from: `${new Date().getFullYear()}-07-01`,                                to: `${new Date().getFullYear()}-09-30` },
                { label: 'Q4',        from: `${new Date().getFullYear()}-10-01`,                                to: `${new Date().getFullYear()}-12-31` },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setFrom(p.from); setTo(p.to); }}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button onClick={generate} disabled={loading} className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              {loading ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 rounded-xl border border-danger-200 dark:border-danger-800 text-sm print:hidden">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 print:hidden">
            <div className="h-32 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            <div className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            <div className="h-64 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !report && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center print:hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary-500" />
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Ready to generate your report</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
              Select a date range above and click Generate Report. Your report will include total hours, breakdown by program, and individual volunteer contributions.
            </p>
          </div>
        )}

        {/* Report */}
        {!loading && report && (
          <>
            {Number(report.summary.total_hours ?? 0) === 0 && (
              <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 rounded-xl border border-warning-200 dark:border-warning-800 text-sm print:hidden">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                No confirmed hours found for this date range. Make sure hours are logged and confirmed on the Hours page.
              </div>
            )}
            <PrintReport data={report} />
          </>
        )}
      </div>
      </PlanGate>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#__next) { display: none !important; }
          header, nav, aside, [data-sidebar], .sidebar { display: none !important; }
          #grant-report-print { display: block !important; }
          @page { margin: 0.75in; size: letter portrait; }
        }
      `}</style>
    </Layout>
  );
}
