import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Eye, EyeOff, Check, ArrowRight, Shield,
  Users, Clock, Zap, Star, ChevronRight,
} from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  .signup-page { font-family: 'DM Sans', sans-serif; }
  .sp-display { font-family: 'Playfair Display', serif; }

  .signup-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  /* Left panel */
  .signup-left {
    background: #0a0f1e;
    display: flex; flex-direction: column;
    padding: 40px 56px;
    position: relative; overflow: hidden;
  }
  .signup-left-mesh {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse at 10% 30%, rgba(16,185,129,0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 90% 70%, rgba(245,158,11,0.07) 0%, transparent 45%);
  }
  .signup-left-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .sp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 56px; position: relative; z-index: 1; }
  .sp-logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(16,185,129,0.3);
  }
  .sp-logo-text { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: white; }

  .sp-left-headline {
    font-family: 'Playfair Display', serif;
    font-size: 38px; font-weight: 600; color: white;
    line-height: 1.15; letter-spacing: -0.8px;
    margin-bottom: 16px;
    position: relative; z-index: 1;
  }
  .sp-left-headline em { color: #10b981; font-style: italic; }
  .sp-left-sub {
    font-size: 15px; color: rgba(255,255,255,0.5);
    line-height: 1.7; margin-bottom: 48px;
    position: relative; z-index: 1;
  }

  .sp-value-list { position: relative; z-index: 1; margin-bottom: 48px; }
  .sp-value-item {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 18px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sp-value-item:last-child { border: none; }
  .sp-value-icon {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sp-value-title { font-size: 14px; font-weight: 700; color: white; margin-bottom: 3px; }
  .sp-value-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.5; }

  .sp-testimonial {
    position: relative; z-index: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 24px;
    margin-top: auto;
  }
  .sp-testimonial-quote { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.65; font-style: italic; margin-bottom: 16px; }
  .sp-testimonial-author { font-size: 13px; font-weight: 700; color: white; }
  .sp-testimonial-role { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }

  /* Right panel */
  .signup-right {
    background: #f8fafc;
    display: flex; align-items: center; justify-content: center;
    padding: 40px;
  }
  .signup-form-wrap { width: 100%; max-width: 440px; }

  .sp-form-header { margin-bottom: 36px; }
  .sp-form-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 600; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 8px; }
  .sp-form-sub { font-size: 15px; color: #64748b; line-height: 1.55; }

  /* Trial badge */
  .trial-badge {
    display: flex; align-items: center; gap: 10px;
    background: #d1fae5; border: 1px solid #a7f3d0;
    border-radius: 10px; padding: 12px 16px;
    margin-bottom: 28px;
  }
  .trial-badge-text { font-size: 13.5px; font-weight: 600; color: #065f46; }
  .trial-badge-sub { font-size: 12px; color: #059669; margin-top: 1px; }

  /* Form */
  .sp-field { margin-bottom: 16px; }
  .sp-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .sp-input-wrap { position: relative; }
  .sp-input {
    width: 100%; padding: 12px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 10px;
    font-size: 14.5px; font-family: 'DM Sans', sans-serif;
    color: #0f172a; background: white;
    outline: none; transition: border-color 0.18s, box-shadow 0.18s;
    appearance: none;
  }
  .sp-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
  .sp-input.error { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
  .sp-input-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #94a3b8; display: flex; align-items: center;
  }
  .sp-input-btn:hover { color: #475569; }
  .sp-field-error { color: #ef4444; font-size: 12px; font-weight: 500; margin-top: 5px; }

  .sp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* Plan selector */
  .plan-selector { margin-bottom: 20px; }
  .plan-opt {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px; border: 1.5px solid #e2e8f0;
    border-radius: 10px; cursor: pointer; margin-bottom: 8px;
    transition: all 0.18s; background: white;
    text-align: left; width: 100%; font-family: 'DM Sans', sans-serif;
  }
  .plan-opt.selected { border-color: #10b981; background: #f0fdf4; }
  .plan-opt-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.18s; }
  .plan-opt.selected .plan-opt-radio { border-color: #10b981; background: #10b981; }
  .plan-opt-name { font-size: 14px; font-weight: 700; color: #0f172a; }
  .plan-opt-desc { font-size: 12px; color: #94a3b8; }
  .plan-opt-price { margin-left: auto; font-size: 14px; font-weight: 700; color: #0f172a; }
  .plan-opt-badge { font-size: 10px; font-weight: 700; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 2px 8px; border-radius: 99px; margin-left: 6px; }

  /* Submit button */
  .sp-submit {
    width: 100%; padding: 14px 24px;
    border: none; border-radius: 10px;
    font-size: 15px; font-weight: 700; color: white;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(16,185,129,0.3);
    margin-top: 8px;
  }
  .sp-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(16,185,129,0.4); }
  .sp-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  /* Divider */
  .sp-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
  .sp-divider-line { flex: 1; height: 1px; background: #e2e8f0; }
  .sp-divider-text { font-size: 12px; font-weight: 600; color: #94a3b8; }

  /* Google button */
  .sp-google {
    width: 100%; padding: 13px 24px;
    border: 1.5px solid #e2e8f0; border-radius: 10px;
    font-size: 14px; font-weight: 600; color: #374151;
    background: white; cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .sp-google:hover { border-color: #cbd5e1; background: #f8fafc; }

  /* Trust microcopy */
  .sp-trust { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; justify-content: center; }
  .sp-trust-item { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; color: #94a3b8; }
  .sp-trust-item svg { color: #10b981; }

  /* Progress steps */
  .sp-steps { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
  .sp-step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    border: 2px solid #e2e8f0; color: #94a3b8;
    transition: all 0.2s;
  }
  .sp-step-dot.active { border-color: #10b981; background: #10b981; color: white; }
  .sp-step-dot.done { border-color: #10b981; background: #10b981; color: white; }
  .sp-step-line { flex: 1; height: 2px; background: #e2e8f0; transition: background 0.2s; }
  .sp-step-line.done { background: #10b981; }

  .success-screen {
    text-align: center; padding: 40px 20px;
  }
  .success-icon {
    width: 72px; height: 72px; border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #059669);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
    box-shadow: 0 8px 24px rgba(16,185,129,0.35);
  }

  @media (max-width: 768px) {
    .signup-shell { grid-template-columns: 1fr; }
    .signup-left { display: none; }
    .signup-right { padding: 32px 24px; }
  }

  @keyframes check-pop { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
  .check-pop { animation: check-pop 0.4s ease 0.1s both; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

interface FormErrors {
  [key: string]: string;
}

const PLANS = [
  { id: 'discover', name: 'Discover', desc: 'Perfect for small teams getting started', price: '$49/mo', badge: null },
  { id: 'grow', name: 'Grow', desc: 'Most popular for growing organizations', price: '$149/mo', badge: 'Most Popular' },
  { id: 'enterprise', name: 'Enterprise', desc: 'For large organizations', price: 'Custom', badge: null },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('discover');
  const [errors, setErrors] = useState<FormErrors>({});
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizard, setWizard] = useState({
    orgName: '',
    description: '',
    website: '',
    orgEmail: '',
    phone: '',
    taxId: '',
    address: '',
  });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    orgName: '',
    email: '',
    password: '',
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.orgName.trim()) e.orgName = 'Organization name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  };

  const pwStrength = (p: string) => {
    if (!p) return null;
    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    if (score <= 1) return { label: 'Weak', color: '#ef4444', w: '25%' };
    if (score === 2) return { label: 'Fair', color: '#f59e0b', w: '50%' };
    if (score === 3) return { label: 'Good', color: '#10b981', w: '75%' };
    return { label: 'Strong', color: '#059669', w: '100%' };
  };

  const strength = pwStrength(form.password);

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setApiError('');
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
      const res = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
          email: form.email.trim(),
          password: form.password,
          orgName: form.orgName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      localStorage.setItem('vf_token', json.data.token);
      setWizard((w) => ({ ...w, orgName: form.orgName.trim() }));
      setLoading(false);
      setSuccess(true);
    } catch {
      setApiError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  };

  const handleWizardFinish = async () => {
    setWizardSaving(true);
    try {
      const token = localStorage.getItem('vf_token');
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
      await fetch(`${base}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(wizard),
      });
    } catch {
      // silent fail — user can complete profile in Settings → Organization
    } finally {
      router.push('/');
    }
  };

  const VALUE_ITEMS = [
    { icon: Zap, color: 'rgba(16,185,129,0.15)', iconColor: '#10b981', title: '30-day free trial', desc: 'Full access to all Pro features. No commitment.' },
    { icon: Clock, color: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa', title: 'Set up in 15 minutes', desc: 'Import your volunteers and create your first event fast.' },
    { icon: Shield, color: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24', title: 'No credit card required', desc: 'Start free, upgrade when you\'re ready.' },
    { icon: Users, color: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa', title: 'Unlimited volunteers', desc: 'Manage as many volunteers as your organization needs.' },
  ];

  return (
    <div className="signup-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="signup-shell">

        {/* Left panel */}
        <div className="signup-left">
          <div className="signup-left-mesh" />
          <div className="signup-left-grid" />
          <a href="/landing" className="sp-logo">
            <img src="/vf-logo.png" className="w-12 h-12" alt="" aria-hidden="true" />
            <span className="sp-logo-text">VolunteerFlow</span>
          </a>

          <h1 className="sp-left-headline">
            Built for organizations<br />
            <em>making a difference</em>
          </h1>
          <p className="sp-left-sub">
            Start your free 30-day trial today. No credit card, no setup fees, no contracts. Just a better way to manage your volunteers.
          </p>

          <div className="sp-value-list">
            {VALUE_ITEMS.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="sp-value-item">
                  <div className="sp-value-icon" style={{ background: v.color }}>
                    <Icon className="w-4 h-4" style={{ color: v.iconColor }} />
                  </div>
                  <div>
                    <div className="sp-value-title">{v.title}</div>
                    <div className="sp-value-desc">{v.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right panel */}
        <div className="signup-right">
          <div className="signup-form-wrap">

            {success ? (
              <div>
                {/* ── Wizard header: progress dots + skip ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {([1, 2, 3] as const).map((n, i) => (
                      <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {i > 0 && (
                          <div className={`sp-step-line${wizardStep > n - 1 ? ' done' : ''}`} style={{ width: 28 }} />
                        )}
                        <div className={`sp-step-dot${wizardStep === n ? ' active' : wizardStep > n ? ' done' : ''}`}>
                          {wizardStep > n ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
                        </div>
                      </span>
                    ))}
                    <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6, fontWeight: 500 }}>
                      Step {wizardStep} of 3
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Skip setup →
                  </button>
                </div>

                {/* ── Step header ── */}
                <div style={{ marginBottom: 20 }}>
                  <h2 className="sp-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                    {wizardStep === 1 ? 'Your Organization' : wizardStep === 2 ? 'Contact Info' : 'Legal & Location'}
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b' }}>
                    {wizardStep === 1
                      ? 'Tell us a bit about your org'
                      : wizardStep === 2
                      ? 'How can people reach your organization?'
                      : 'Optional — used for receipts and compliance'}
                  </p>
                </div>

                {/* ── Step 1: org name + description ── */}
                {wizardStep === 1 && (
                  <>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-orgName">Organization Name</label>
                      <input
                        id="wizard-orgName"
                        className="sp-input"
                        type="text"
                        placeholder="Green Future Foundation"
                        value={wizard.orgName}
                        onChange={(e) => setWizard((w) => ({ ...w, orgName: e.target.value }))}
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-description">Description</label>
                      <textarea
                        id="wizard-description"
                        className="sp-input"
                        placeholder="What does your organization do?"
                        value={wizard.description}
                        onChange={(e) => setWizard((w) => ({ ...w, description: e.target.value }))}
                        rows={3}
                        style={{ resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>
                  </>
                )}

                {/* ── Step 2: website + email + phone ── */}
                {wizardStep === 2 && (
                  <>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-website">Website</label>
                      <input
                        id="wizard-website"
                        className="sp-input"
                        type="url"
                        placeholder="https://yourorg.org"
                        value={wizard.website}
                        onChange={(e) => setWizard((w) => ({ ...w, website: e.target.value }))}
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-orgEmail">Contact Email</label>
                      <input
                        id="wizard-orgEmail"
                        className="sp-input"
                        type="email"
                        placeholder="hello@yourorg.org"
                        value={wizard.orgEmail}
                        onChange={(e) => setWizard((w) => ({ ...w, orgEmail: e.target.value }))}
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-phone">Phone Number</label>
                      <input
                        id="wizard-phone"
                        className="sp-input"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={wizard.phone}
                        onChange={(e) => setWizard((w) => ({ ...w, phone: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {/* ── Step 3: tax ID + address ── */}
                {wizardStep === 3 && (
                  <>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-taxId">Tax ID / EIN</label>
                      <input
                        id="wizard-taxId"
                        className="sp-input"
                        type="text"
                        placeholder="12-3456789"
                        value={wizard.taxId}
                        onChange={(e) => setWizard((w) => ({ ...w, taxId: e.target.value }))}
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label" htmlFor="wizard-address">Address</label>
                      <textarea
                        id="wizard-address"
                        className="sp-input"
                        placeholder="123 Main St, City, State 12345"
                        value={wizard.address}
                        onChange={(e) => setWizard((w) => ({ ...w, address: e.target.value }))}
                        rows={3}
                        style={{ resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>
                  </>
                )}

                {/* ── Footer: back + next/finish ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
                  <div>
                    {wizardStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setWizardStep((s) => (s - 1) as 1 | 2 | 3)}
                        style={{ fontSize: 14, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: '10px 0' }}
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                  <button
                    className="sp-submit"
                    style={{ width: 'auto', paddingLeft: 32, paddingRight: 32, marginTop: 0 }}
                    onClick={wizardStep < 3 ? () => setWizardStep((s) => (s + 1) as 1 | 2 | 3) : handleWizardFinish}
                    disabled={wizardSaving}
                  >
                    {wizardSaving ? (
                      <>
                        <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        Saving…
                      </>
                    ) : wizardStep < 3 ? (
                      <>Next <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      <>Finish <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="sp-form-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h1 className="sp-form-title">Start your free trial</h1>
                      <p className="sp-form-sub">30 days free · No credit card required</p>
                    </div>
                    <a href="/landing?mode=signin" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
                      Sign in →
                    </a>
                  </div>

                  {/* Trial badge */}
                  <div className="trial-badge">
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="trial-badge-text">30-day free trial — all Pro features included</div>
                      <div className="trial-badge-sub">No credit card needed · Cancel anytime</div>
                    </div>
                  </div>
                </div>

                {/* Google signup */}
                <button className="sp-google">
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="sp-divider">
                  <div className="sp-divider-line" />
                  <span className="sp-divider-text">or sign up with email</span>
                  <div className="sp-divider-line" />
                </div>

                {/* Form fields */}
                <div className="sp-row">
                  <div className="sp-field">
                    <label className="sp-label">First name</label>
                    <input
                      className={`sp-input ${errors.firstName ? 'error' : ''}`}
                      type="text"
                      placeholder="Jane"
                      value={form.firstName}
                      onChange={(e) => set('firstName')(e.target.value)}
                    />
                    {errors.firstName && <div className="sp-field-error">{errors.firstName}</div>}
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Last name</label>
                    <input
                      className={`sp-input ${errors.lastName ? 'error' : ''}`}
                      type="text"
                      placeholder="Smith"
                      value={form.lastName}
                      onChange={(e) => set('lastName')(e.target.value)}
                    />
                    {errors.lastName && <div className="sp-field-error">{errors.lastName}</div>}
                  </div>
                </div>

                <div className="sp-field">
                  <label className="sp-label">Organization name</label>
                  <input
                    className={`sp-input ${errors.orgName ? 'error' : ''}`}
                    type="text"
                    placeholder="Green Future Foundation"
                    value={form.orgName}
                    onChange={(e) => set('orgName')(e.target.value)}
                  />
                  {errors.orgName && <div className="sp-field-error">{errors.orgName}</div>}
                </div>

                <div className="sp-field">
                  <label className="sp-label">Work email</label>
                  <input
                    className={`sp-input ${errors.email ? 'error' : ''}`}
                    type="email"
                    placeholder="jane@yourorg.org"
                    value={form.email}
                    onChange={(e) => set('email')(e.target.value)}
                  />
                  {errors.email && <div className="sp-field-error">{errors.email}</div>}
                </div>

                <div className="sp-field">
                  <label className="sp-label">Password</label>
                  <div className="sp-input-wrap">
                    <input
                      className={`sp-input ${errors.password ? 'error' : ''}`}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={form.password}
                      onChange={(e) => set('password')(e.target.value)}
                      style={{ paddingRight: 44 }}
                    />
                    <button className="sp-input-btn" type="button" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && strength && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: strength.w, background: strength.color, borderRadius: 99, transition: 'width 0.3s' }} />
                      </div>
                      <p style={{ fontSize: 12, color: strength.color, fontWeight: 600, marginTop: 4 }}>
                        {strength.label} password
                      </p>
                    </div>
                  )}
                  {errors.password && <div className="sp-field-error">{errors.password}</div>}
                </div>

                {/* Plan selector */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Choose your plan</div>
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      className={`plan-opt ${selectedPlan === p.id ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan(p.id)}
                      type="button"
                    >
                      <div className={`plan-opt-radio`}>
                        {selectedPlan === p.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="plan-opt-name">{p.name}</span>
                          {p.badge && <span className="plan-opt-badge">{p.badge}</span>}
                        </div>
                        <div className="plan-opt-desc">{p.desc}</div>
                      </div>
                      <div className="plan-opt-price">{p.price}</div>
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 }}>
                  By signing up you agree to our{' '}
                  <a href="#" style={{ color: '#10b981', textDecoration: 'underline' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" style={{ color: '#10b981', textDecoration: 'underline' }}>Privacy Policy</a>.
                </p>

                {apiError && (
                  <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    {apiError}
                  </p>
                )}

                <button className="sp-submit" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Creating your account…
                    </>
                  ) : (
                    <>Create free account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="sp-trust">
                  {[
                    { icon: Shield, text: 'Data encrypted' },
                    { icon: Check, text: 'No credit card' },
                    { icon: Zap, text: 'Free 30 days' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="sp-trust-item">
                      <Icon className="w-3 h-3" />
                      {text}
                    </div>
                  ))}
                </div>

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
