import { useState, useRef } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Download,
  RefreshCw,
  Users,
  ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'map' | 'preview' | 'done';

interface ColumnMapping {
  csvCol: string;
  field: string;
}

interface ParsedRow {
  [key: string]: string;
}

interface MappedVolunteer {
  name: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  skills: string;
  [key: string]: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VOLUNTEER_FIELDS = [
  { key: 'name', label: 'Full Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'location', label: 'Location / City', required: false },
  { key: 'status', label: 'Status (active/inactive)', required: false },
  { key: 'skills', label: 'Skills (comma-separated)', required: false },
  { key: 'joinDate', label: 'Join Date', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: '__skip', label: '— Skip this column —', required: false },
];

const SAMPLE_CSV = `First Name,Last Name,Email,Phone,City,Skills
Jane,Smith,jane.smith@email.com,555-0101,New York,"Community Outreach, Fundraising"
Carlos,Rivera,c.rivera@email.com,555-0102,Los Angeles,Event Planning
Mia,Patel,mia.patel@email.com,555-0103,Chicago,"Teaching, Mentorship"
Tom,Baker,t.baker@email.com,555-0104,Houston,Photography
Nina,Okonkwo,nina.o@email.com,555-0105,Phoenix,"First Aid, Safety"`;

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    // Simple CSV parse (handles quoted fields)
    const values: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else { cur += line[i]; }
    }
    values.push(cur.trim());
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lower = headers.map((h) => h.toLowerCase());
  headers.forEach((h, i) => {
    const l = lower[i];
    if (l.includes('first') && l.includes('name')) map[h] = '__first';
    else if (l.includes('last') && l.includes('name')) map[h] = '__last';
    else if (l === 'name' || l === 'full name' || l === 'fullname') map[h] = 'name';
    else if (l.includes('email')) map[h] = 'email';
    else if (l.includes('phone') || l.includes('mobile')) map[h] = 'phone';
    else if (l.includes('city') || l.includes('location') || l.includes('address')) map[h] = 'location';
    else if (l.includes('skill')) map[h] = 'skills';
    else if (l.includes('status')) map[h] = 'status';
    else if (l.includes('date') || l.includes('join')) map[h] = 'joinDate';
    else if (l.includes('note')) map[h] = 'notes';
    else map[h] = '__skip';
  });
  return map;
}

// ─── Step components ──────────────────────────────────────────────────────────

function UploadStep({
  onParsed,
}: {
  onParsed: (headers: string[], rows: ParsedRow[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
  const MAX_ROWS = 5000;

  const process = (text: string) => {
    if (text.length > MAX_FILE_BYTES) {
      setError('CSV data is too large. Maximum allowed size is 10 MB.');
      return;
    }
    const { headers, rows } = parseCsv(text);
    if (headers.length === 0 || rows.length === 0) {
      setError('Could not parse the CSV. Make sure it has a header row and at least one data row.');
      return;
    }
    if (rows.length > MAX_ROWS) {
      setError(`Too many rows (${rows.length.toLocaleString()}). Maximum import size is ${MAX_ROWS.toLocaleString()} rows per batch.`);
      return;
    }
    setError('');
    onParsed(headers, rows);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a .csv file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => process(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const downloadSample = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }));
    a.download = 'volunteer-import-sample.csv';
    a.click();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
          {(['file', 'paste'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {t === 'file' ? 'Upload CSV file' : 'Paste CSV data'}
            </button>
          ))}
        </div>

        {tab === 'file' ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Drop your CSV file here</p>
            <p className="text-xs text-neutral-400">or click to browse</p>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={SAMPLE_CSV}
              rows={8}
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <Button onClick={() => process(pasted)} disabled={!pasted.trim()} className="mt-3 flex items-center gap-2">
              Parse data <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <p className="text-xs text-neutral-400">Need a template?</p>
          <button onClick={downloadSample} className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            <Download className="w-3.5 h-3.5" /> Download sample CSV
          </button>
        </div>
      </Card>
    </div>
  );
}

function MapStep({
  headers,
  rows,
  mapping,
  setMapping,
  onNext,
  onBack,
}: {
  headers: string[];
  rows: ParsedRow[];
  mapping: Record<string, string>;
  setMapping: (m: Record<string, string>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const hasRequired = VOLUNTEER_FIELDS.filter((f) => f.required).every((f) =>
    Object.values(mapping).includes(f.key) ||
    (f.key === 'name' && (Object.values(mapping).includes('__first') || Object.values(mapping).includes('name')))
  );

  const emailMapped = Object.values(mapping).includes('email');
  const nameMapped = Object.values(mapping).includes('name') ||
    (Object.values(mapping).includes('__first'));

  const canProceed = emailMapped && nameMapped;

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">Map your columns</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
          Match each column in your file to a volunteer field. Auto-mapping has been applied where possible.
        </p>

        <div className="space-y-3">
          {headers.map((h) => (
            <div key={h} className="grid grid-cols-2 gap-4 items-center p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{h}</p>
                <p className="text-xs text-neutral-400 mt-0.5 font-mono truncate">
                  {rows.slice(0, 2).map((r) => r[h]).filter(Boolean).join(', ')}
                </p>
              </div>
              <select
                value={mapping[h] ?? '__skip'}
                onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {VOLUNTEER_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}{f.required ? ' *' : ''}
                  </option>
                ))}
                <option value="__first">First Name (combine with Last)</option>
                <option value="__last">Last Name (combine with First)</option>
              </select>
            </div>
          ))}
        </div>

        {!canProceed && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg text-sm text-warning-700 dark:text-warning-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Map at least <strong>Name</strong> and <strong>Email</strong> to continue.
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={!canProceed} className="flex items-center gap-2">
            Preview import <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PreviewStep({
  rows,
  mapping,
  onImport,
  onBack,
  importing,
}: {
  rows: ParsedRow[];
  mapping: Record<string, string>;
  onImport: (volunteers: MappedVolunteer[]) => void;
  onBack: () => void;
  importing: boolean;
}) {
  const mapped: MappedVolunteer[] = rows.map((row) => {
    const vol: MappedVolunteer = { name: '', email: '', phone: '', location: '', status: 'active', skills: '' };
    let firstName = '';
    let lastName = '';
    Object.entries(mapping).forEach(([col, field]) => {
      if (field === '__skip') return;
      if (field === '__first') firstName = row[col] ?? '';
      else if (field === '__last') lastName = row[col] ?? '';
      else vol[field] = row[col] ?? '';
    });
    if (firstName || lastName) vol.name = `${firstName} ${lastName}`.trim();
    return vol;
  });

  const valid = mapped.filter((v) => v.name && v.email);
  const invalid = mapped.filter((v) => !v.name || !v.email);

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Preview</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {valid.length} valid · {invalid.length} will be skipped (missing name or email)
            </p>
          </div>
          {invalid.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">
              <AlertCircle className="w-3.5 h-3.5" /> {invalid.length} rows skipped
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden sm:table-cell">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden lg:table-cell">Skills</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {mapped.slice(0, 20).map((v, i) => {
                const isValid = !!(v.name && v.email);
                return (
                  <tr key={i} className={`border-b border-neutral-50 dark:border-neutral-800/50 ${!isValid ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{v.name || <span className="text-danger-400 italic">missing</span>}</td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">{v.email || <span className="text-danger-400 italic">missing</span>}</td>
                    <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 hidden sm:table-cell">{v.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 hidden md:table-cell">{v.location || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 hidden lg:table-cell truncate max-w-[140px]">{v.skills || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isValid
                        ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-100 dark:bg-success-900/30"><Check className="w-3 h-3 text-success-600 dark:text-success-400" /></span>
                        : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger-100 dark:bg-danger-900/30"><X className="w-3 h-3 text-danger-600 dark:text-danger-400" /></span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {mapped.length > 20 && (
            <p className="px-4 py-3 text-xs text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">
              Showing first 20 of {mapped.length} rows
            </p>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={onBack}>Back</Button>
          <Button onClick={() => onImport(valid)} disabled={valid.length === 0 || importing} className="flex items-center gap-2">
            {importing
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importing…</>
              : <><Users className="w-4 h-4" />Import {valid.length} volunteer{valid.length !== 1 ? 's' : ''}</>
            }
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DoneStep({ count, onReset }: { count: number; onReset: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <Card>
        <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-success-600 dark:text-success-400" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Import complete!</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          {count} volunteer{count !== 1 ? 's' : ''} have been imported and are now visible in your Volunteers list.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onReset} className="flex-1 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Import more
          </Button>
          <Button onClick={() => (window.location.href = '/volunteers')} className="flex-1 flex items-center justify-center gap-2">
            <Users className="w-4 h-4" /> View volunteers
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STEPS: { id: ImportStep; label: string }[] = [
  { id: 'upload', label: 'Upload file' },
  { id: 'map', label: 'Map columns' },
  { id: 'preview', label: 'Preview' },
  { id: 'done', label: 'Done' },
];

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [importing, setImporting] = useState(false);

  const handleParsed = (h: string[], r: ParsedRow[]) => {
    setHeaders(h);
    setRows(r);
    setMapping(autoMap(h));
    setStep('map');
  };

  const handleImport = (volunteers: MappedVolunteer[]) => {
    setImporting(true);
    setTimeout(() => {
      setImportedCount(volunteers.length);
      setImporting(false);
      setStep('done');
    }, 1500);
  };

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportedCount(0);
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <Layout>
      <Head><title>Import — VolunteerFlow</title></Head>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Import Volunteers</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Bulk import volunteers from a CSV or Excel export.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  done
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                    : active
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                }`}>
                  {done ? <Check className="w-3 h-3" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center text-[9px] font-bold">{i + 1}</span>}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />}
              </div>
            );
          })}
        </div>

        {step === 'upload' && <UploadStep onParsed={handleParsed} />}
        {step === 'map' && (
          <MapStep
            headers={headers}
            rows={rows}
            mapping={mapping}
            setMapping={setMapping}
            onNext={() => setStep('preview')}
            onBack={() => setStep('upload')}
          />
        )}
        {step === 'preview' && (
          <PreviewStep
            rows={rows}
            mapping={mapping}
            onImport={handleImport}
            onBack={() => setStep('map')}
            importing={importing}
          />
        )}
        {step === 'done' && <DoneStep count={importedCount} onReset={reset} />}
      </div>
    </Layout>
  );
}
