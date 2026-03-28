import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Check, ArrowRight, Camera, X as XIcon } from 'lucide-react';
import { getFormConfig, type FormField } from '@/lib/signupForms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-neutral-300 bg-white text-neutral-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 transition-colors';

function loadConfig() {
  return getFormConfig('master');
}

// ─── Image field ──────────────────────────────────────────────────────────────

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState('');
  const handle = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setErr('Max 5 MB'); return; }
    setErr('');
    const r = new FileReader();
    r.onload = (e) => onChange((e.target?.result as string) ?? '');
    r.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-neutral-400" />}
      </div>
      <div className="space-y-1">
        <label className="block cursor-pointer">
          <span className="inline-block px-3 py-1.5 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700">
            {value ? 'Change' : 'Upload photo'}
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 transition-colors">
            <XIcon className="w-3 h-3" /> Remove
          </button>
        )}
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    </div>
  );
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange, readOnly }: { field: FormField; value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  if (field.type === 'image') return <ImageField value={value} onChange={onChange} />;
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : '')} required={field.required} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
        <span className="text-sm text-neutral-700">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</span>
      </label>
    );
  }
  if (field.type === 'textarea') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={3} required={field.required} readOnly={readOnly} className={inputCls + ' resize-none' + (readOnly ? ' bg-neutral-50 text-neutral-500 cursor-not-allowed' : '')} />;
  }
  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} required={field.required} disabled={readOnly} className={inputCls + (readOnly ? ' bg-neutral-50 text-neutral-500 cursor-not-allowed' : '')}>
        <option value="">Select…</option>
        {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input
      type={field.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      readOnly={readOnly}
      className={inputCls + (readOnly ? ' bg-neutral-50 text-neutral-500 cursor-not-allowed' : '')}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateAccountPage() {
  const router = useRouter();

  // Prefill from URL
  const [prefill, setPrefill] = useState({ name: '', email: '', phone: '' });
  useEffect(() => {
    if (!router.isReady) return;
    const { name, email, phone } = router.query;
    setPrefill({
      name:  name  ? String(name)  : '',
      email: email ? String(email) : '',
      phone: phone ? String(phone) : '',
    });
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load org-configured form fields
  const [config, setConfig] = useState(() => getFormConfig('master'));
  useEffect(() => { setConfig(loadConfig()); }, []);
  const activeFields = useMemo(() => config.fields.filter((f) => f.enabled), [config]);

  // Form values — initialize once fields + prefill are ready
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const base = Object.fromEntries(activeFields.map((f) => [f.id, '']));
    if (prefill.name)  base.name  = prefill.name;
    if (prefill.email) base.email = prefill.email;
    if (prefill.phone) base.phone = prefill.phone;
    setValues(base);
  }, [activeFields, prefill]);

  const setValue = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));

  // Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const firstName = prefill.name.split(' ')[0] || 'there';

  const pwStrength = (p: string) => {
    if (!p) return null;
    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    if (score <= 1) return { label: 'Weak',   color: '#ef4444', w: '25%' };
    if (score === 2) return { label: 'Fair',   color: '#f59e0b', w: '50%' };
    if (score === 3) return { label: 'Good',   color: '#10b981', w: '75%' };
    return              { label: 'Strong', color: '#059669', w: '100%' };
  };
  const strength = pwStrength(password);

  // Pair half-width fields into 2-col rows
  const rows: FormField[][] = [];
  let i = 0;
  while (i < activeFields.length) {
    const f = activeFields[i];
    if (f.halfWidth && i + 1 < activeFields.length && activeFields[i + 1].halfWidth) {
      rows.push([f, activeFields[i + 1]]);
      i += 2;
    } else {
      rows.push([f]);
      i++;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!password) e2.password = 'Please create a password';
    else if (password.length < 8) e2.password = 'Password must be at least 8 characters';
    if (!confirm) e2.confirm = 'Please confirm your password';
    else if (confirm !== password) e2.confirm = 'Passwords do not match';
    setErrors(e2);
    if (Object.keys(e2).length) return;

    setSubmitting(true);
    // TODO: POST /api/volunteers/activate with { ...values, password } once auth is wired up
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      setTimeout(() => router.push('/volunteerportal'), 2000);
    }, 1000);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <Head><title>Account Created — VolunteerFlow</title></Head>
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">You're all set, {firstName}!</h1>
          <p className="text-sm text-neutral-500">Taking you to your volunteer portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-start justify-center px-4 py-10">
      <Head><title>Create Account — VolunteerFlow</title></Head>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 mb-5">
            <img src="/vf-logo.png" className="w-9 h-9" alt="" aria-hidden="true" />
            <span className="font-bold text-neutral-900">VolunteerFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            {prefill.name ? `Hey ${firstName}, welcome!` : 'Create your account'}
          </h1>
          <p className="text-sm text-neutral-500">
            You've been approved. Fill in your profile and set a password to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Org-configured profile fields */}
          {rows.map((row, ri) =>
            row.length === 2 ? (
              <div key={ri} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {row.map((field) => (
                  <div key={field.id}>
                    {field.type !== 'checkbox' && (
                      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    <FieldInput
                      field={field}
                      value={values[field.id] ?? ''}
                      onChange={(v) => setValue(field.id, v)}
                      readOnly={field.id === 'email'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div key={ri}>
                {row[0].type !== 'checkbox' && (
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                    {row[0].label}
                    {row[0].required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                <FieldInput
                  field={row[0]}
                  value={values[row[0].id] ?? ''}
                  onChange={(v) => setValue(row[0].id, v)}
                  readOnly={row[0].id === 'email'}
                />
              </div>
            )
          )}

          {/* Divider */}
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-4">Set Your Password</p>

            {/* Password */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className={inputCls + ' pr-10' + (errors.password ? ' border-red-400' : '')}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && strength && (
                  <div className="mt-2">
                    <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                      <div style={{ width: strength.w, background: strength.color }} className="h-full rounded-full transition-all duration-300" />
                    </div>
                    <p className="text-xs font-semibold mt-1" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Confirm password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCf ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className={inputCls + ' pr-10' + (errors.confirm ? ' border-red-400' : '')}
                  />
                  <button type="button" onClick={() => setShowCf(!showCf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Activating account…</>
              ) : (
                <>Activate my account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
