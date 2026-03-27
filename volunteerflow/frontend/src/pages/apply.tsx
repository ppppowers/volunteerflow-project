'use client';

import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { CheckCircle, ChevronLeft, Camera, X as XIcon } from 'lucide-react';
import { signupFormConfigs, type FormField } from '@/lib/signupForms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-neutral-300 bg-white text-neutral-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 transition-colors';

const accentMap = {
  volunteer: {
    gradient: 'from-primary-600 to-primary-800',
    btn: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
  },
  member: {
    gradient: 'from-indigo-600 to-indigo-800',
    btn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
  },
  employee: {
    gradient: 'from-emerald-600 to-emerald-800',
    btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
  },
} as const;

// ─── Image upload with enforced size limit ─────────────────────────────────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function ImageUploadField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [sizeError, setSizeError] = useState('');

  const handleFile = (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      setSizeError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed is 5 MB.`);
      return;
    }
    setSizeError('');
    const reader = new FileReader();
    reader.onload = (ev) => onChange((ev.target?.result as string) ?? '');
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0">
        {value ? (
          <img src={value} alt="Photo preview" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-7 h-7 text-neutral-400" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <label className="block w-full cursor-pointer">
          <span className="inline-block px-4 py-2 text-sm font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700">
            {value ? 'Change Photo' : 'Upload Photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            required={required && !value}
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setSizeError(''); }}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-danger-500 transition-colors"
          >
            <XIcon className="w-3 h-3" aria-hidden="true" /> Remove
          </button>
        )}
        {sizeError ? (
          <p className="text-xs text-red-600">{sizeError}</p>
        ) : (
          <p className="text-xs text-neutral-400">JPG, PNG or GIF · max 5 MB</p>
        )}
      </div>
    </div>
  );
}

// ─── Field renderer ────────────────────────────────────────────────────────────

interface FieldProps {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}

function FieldInput({ field, value, onChange }: FieldProps) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={inputCls + ' resize-none'}
          required={field.required}
        />
      );
    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          required={field.required}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'checkbox':
      return (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : '')}
            required={field.required}
            className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-neutral-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      );
    case 'image':
      return (
        <ImageUploadField value={value} onChange={onChange} required={field.required} />
      );
    default:
      return (
        <input
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputCls}
        />
      );
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const router = useRouter();
  const rawType = router.query.type as string | undefined;
  const type: 'volunteer' | 'member' | 'employee' =
    rawType === 'member' ? 'member' : rawType === 'employee' ? 'employee' : 'volunteer';

  const accent = accentMap[type];

  // Load config from localStorage (falls back to module defaults)
  const [config, setConfig] = useState(() => signupFormConfigs[type]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vf_signup_form_configs') ?? '{}');
      setConfig(stored[type] ?? signupFormConfigs[type]);
    } catch {
      setConfig(signupFormConfigs[type]);
    }
  }, [type]);

  const activeFields = useMemo(
    () => config.fields.filter((f) => f.enabled),
    [config],
  );

  const [values, setValues] = useState<Record<string, string>>({});

  // Reset form values whenever the field list changes; inject URL prefill when router is ready
  useEffect(() => {
    const base = Object.fromEntries(activeFields.map((f) => [f.id, '']));
    if (router.isReady) {
      const { name, email, phone } = router.query;
      if (name)  base.name  = String(name);
      if (email) base.email = String(email);
      if (phone) base.phone = String(phone);
    }
    setValues(base);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFields, router.isReady]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setValue = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const templateId = router.isReady ? (router.query.form as string | undefined) : undefined;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

    try {
      await fetch(`${apiBase}/form-submissions/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateId || undefined,
          name: values.name || '',
          email: values.email || '',
          phone: values.phone || '',
          answers: values,
          applicantType: type,
        }),
      });
    } catch {
      // Proceed to success screen even if offline — don't block the applicant
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  // Pair consecutive half-width fields into 2-col rows
  const rows: Array<FormField[]> = [];
  let i = 0;
  while (i < activeFields.length) {
    const field = activeFields[i];
    if (field.halfWidth && i + 1 < activeFields.length && activeFields[i + 1].halfWidth) {
      rows.push([field, activeFields[i + 1]]);
      i += 2;
    } else {
      rows.push([field]);
      i++;
    }
  }

  const pageTitle = type === 'member' ? 'Member Signup' : type === 'employee' ? 'Employee Application' : 'Volunteer Application';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${accent.gradient} flex flex-col`}>
      <Head>
        <title>{pageTitle} — VolunteerFlow</title>
        <meta name="description" content={`Apply to become a ${type} with VolunteerFlow.`} />
      </Head>
      {/* Top bar */}
      <header className="p-5 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <img src="/vf-logo.png" className="w-12 h-12" alt="" aria-hidden="true" />
          <span className="text-white font-bold text-lg">VolunteerFlow</span>
        </div>
        <button
          onClick={() => {
            const from = router.query.from as string | undefined;
            if (from === 'admin') { window.close(); return; }
            if (window.history.length > 1) router.back();
            else router.push('/volunteerportal');
          }}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {submitted ? (
            /* ── Success ─────────────────────────────────────────────────── */
            <div className="p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Application Received!</h2>
              <p className="text-neutral-500 max-w-sm">
                Thank you for your interest. We've received your application and will be in touch
                soon.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setValues(Object.fromEntries(activeFields.map((f) => [f.id, ''])));
                }}
                className={`mt-4 px-6 py-2.5 ${accent.btn} text-white text-sm font-semibold rounded-lg transition-colors`}
              >
                Submit Another
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-8 pt-8 pb-6 border-b border-neutral-100">
                <h1 className="text-2xl font-bold text-neutral-900 mb-1">{config.title}</h1>
                <p className="text-sm text-neutral-500">{config.description}</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
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
                      />
                    </div>
                  ),
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3 ${accent.btn} text-white font-semibold rounded-lg transition-colors disabled:opacity-60`}
                  >
                    {submitting ? 'Submitting…' : config.submitLabel}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
