import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Calendar, Bell, BarChart2, CheckCircle, ArrowRight,
  Star, Menu, X, Zap, Clock, Heart, Shield, ChevronRight,
  FileText, MessageSquare, TrendingUp, Settings,
} from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .lp { font-family: 'DM Sans', sans-serif; color: #0f172a; }
  .lp-display { font-family: 'Playfair Display', serif; }

  /* Hero */
  .hero-bg {
    background: #0a0f1e;
    position: relative;
    overflow: hidden;
  }
  .hero-mesh {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 45%),
      radial-gradient(ellipse at 60% 80%, rgba(245,158,11,0.07) 0%, transparent 40%);
  }
  .hero-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%);
  }

  /* Nav */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 0 24px;
    height: 64px;
    display: flex; align-items: center; justify-content: space-between;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .lp-nav.scrolled {
    background: rgba(10,15,30,0.95);
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 0 rgba(255,255,255,0.06);
  }
  .nav-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .nav-logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(16,185,129,0.3);
  }
  .nav-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 600;
    color: white; letter-spacing: -0.3px;
  }
  .nav-links { display: flex; align-items: center; gap: 32px; }
  .nav-link {
    font-size: 14px; font-weight: 500;
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    transition: color 0.15s;
  }
  .nav-link:hover { color: white; }
  .nav-cta {
    display: flex; align-items: center; gap: 10px;
  }
  .btn-nav-secondary {
    padding: 8px 18px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    font-size: 13.5px; font-weight: 600;
    color: rgba(255,255,255,0.8);
    background: transparent;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .btn-nav-secondary:hover { background: rgba(255,255,255,0.08); color: white; }
  .btn-nav-primary {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    font-size: 13.5px; font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 12px rgba(16,185,129,0.35);
  }
  .btn-nav-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.45); }

  /* Hero content */
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.25);
    border-radius: 99px;
    padding: 6px 14px;
    font-size: 13px; font-weight: 600;
    color: #34d399;
    margin-bottom: 28px;
  }
  .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse-dot 2s infinite; }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .hero-h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(42px, 6vw, 76px);
    font-weight: 600;
    color: white;
    line-height: 1.08;
    letter-spacing: -1.5px;
    margin-bottom: 24px;
  }
  .hero-h1 em { color: #10b981; font-style: italic; }
  .hero-h1 span { color: rgba(255,255,255,0.45); }

  .hero-sub {
    font-size: 18px; font-weight: 400;
    color: rgba(255,255,255,0.55);
    line-height: 1.65;
    max-width: 540px;
    margin-bottom: 40px;
  }

  .hero-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .btn-hero-primary {
    padding: 15px 32px;
    border: none; border-radius: 12px;
    font-size: 16px; font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 24px rgba(16,185,129,0.35);
    text-decoration: none;
  }
  .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(16,185,129,0.45); }
  .btn-hero-secondary {
    padding: 15px 28px;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    font-size: 16px; font-weight: 600;
    color: rgba(255,255,255,0.75);
    background: transparent;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .btn-hero-secondary:hover { border-color: rgba(255,255,255,0.35); color: white; }
  .hero-microcopy {
    margin-top: 16px;
    display: flex; align-items: center; gap: 20px;
    flex-wrap: wrap;
  }
  .hero-micro-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 13px; font-weight: 500;
    color: rgba(255,255,255,0.4);
  }
  .hero-micro-item svg { color: #10b981; }

  /* Dashboard mockup */
  .dashboard-mockup {
    background: #111827;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1);
  }
  .mockup-bar {
    background: #0f172a;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 12px 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
  .mockup-body { padding: 20px; }
  .mockup-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .mockup-stat {
    background: #1e293b;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px; padding: 14px;
  }
  .mockup-stat-val { font-size: 22px; font-weight: 700; color: white; font-family: 'Playfair Display', serif; }
  .mockup-stat-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px; font-weight: 500; }
  .mockup-stat-trend { font-size: 11px; color: #10b981; font-weight: 600; margin-top: 4px; }
  .mockup-list { background: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
  .mockup-list-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; }
  .mockup-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .mockup-row:last-child { border: none; }
  .mockup-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
  .mockup-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); flex: 1; }
  .mockup-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }

  /* Sections */
  .section { padding: 96px 0; }
  .section-sm { padding: 64px 0; }
  .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .section-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: #f0fdf4; color: #16a34a;
    border-radius: 99px; padding: 5px 14px;
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 16px;
  }
  .section-h2 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(32px, 4vw, 48px);
    font-weight: 600; color: #0f172a;
    letter-spacing: -0.8px; line-height: 1.15;
    margin-bottom: 16px;
  }
  .section-h2 em { color: #10b981; font-style: italic; }
  .section-sub {
    font-size: 17px; color: #64748b;
    line-height: 1.65; max-width: 520px;
  }


  /* Benefit cards */
  .benefit-card {
    background: white;
    border: 1.5px solid #f1f5f9;
    border-radius: 20px;
    padding: 32px;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }
  .benefit-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 20px 20px 0 0;
    opacity: 0; transition: opacity 0.2s;
  }
  .benefit-card:hover { border-color: #d1fae5; box-shadow: 0 16px 40px rgba(16,185,129,0.08); transform: translateY(-4px); }
  .benefit-card:hover::before { opacity: 1; background: linear-gradient(90deg, #10b981, #059669); }
  .benefit-icon {
    width: 52px; height: 52px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .benefit-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .benefit-desc { font-size: 15px; color: #64748b; line-height: 1.6; }

  /* Use cases */
  .usecase-tab {
    padding: 10px 22px; border-radius: 99px;
    font-size: 14px; font-weight: 600;
    cursor: pointer; border: 1.5px solid #e2e8f0;
    background: white; color: #64748b;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
  }
  .usecase-tab.active { background: #0f172a; color: white; border-color: #0f172a; }
  .usecase-panel { display: none; }
  .usecase-panel.active { display: grid; }

  /* Feature list */
  .feature-item {
    display: flex; gap: 20px;
    padding: 28px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .feature-item:last-child { border: none; }
  .feature-icon-wrap {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* How it works */
  .step-num {
    width: 48px; height: 48px; border-radius: 50%;
    background: #0f172a; color: white;
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    position: relative; z-index: 1;
  }
  .step-connector {
    width: 2px; background: #f1f5f9;
    flex: 1; margin: 8px auto;
  }

  /* Testimonials */
  .testimonial-card {
    background: white; border: 1.5px solid #f1f5f9;
    border-radius: 20px; padding: 32px;
    position: relative;
  }
  .testimonial-quote {
    font-size: 16px; color: #334155; line-height: 1.7;
    margin-bottom: 24px;
    font-style: italic;
  }
  .testimonial-author { font-size: 14px; font-weight: 700; color: #0f172a; }
  .testimonial-role { font-size: 13px; color: #94a3b8; margin-top: 2px; }

  /* Final CTA */
  .final-cta-bg {
    background: #0a0f1e;
    position: relative; overflow: hidden;
  }
  .final-cta-bg::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.15) 0%, transparent 60%);
    pointer-events: none;
  }

  /* Footer */
  .footer { background: #0f172a; }
  .footer-link { font-size: 14px; color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.15s; display: block; margin-bottom: 10px; }
  .footer-link:hover { color: rgba(255,255,255,0.8); }
  .footer-col-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }

  /* Animations */
  @keyframes fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fade-up 0.6s ease both; }
  .fade-up-1 { animation: fade-up 0.6s ease 0.1s both; }
  .fade-up-2 { animation: fade-up 0.6s ease 0.2s both; }
  .fade-up-3 { animation: fade-up 0.6s ease 0.3s both; }

  /* Buttons */
  .btn-primary {
    padding: 14px 28px; border: none; border-radius: 10px;
    font-size: 15px; font-weight: 700; color: white;
    background: linear-gradient(135deg, #10b981, #059669);
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    display: inline-flex; align-items: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(16,185,129,0.30);
    text-decoration: none;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(16,185,129,0.4); }
  .btn-outline-dark {
    padding: 14px 28px; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px;
    font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.7);
    background: transparent;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    display: inline-flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .btn-outline-dark:hover { border-color: rgba(255,255,255,0.35); color: white; }

  .nav-hamburger {
    display: none;
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,0.7); padding: 4px;
  }
  .mobile-menu {
    position: fixed; top: 64px; left: 0; right: 0; z-index: 99;
    background: rgba(10,15,30,0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 16px 24px 24px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .mobile-menu-link {
    font-size: 16px; font-weight: 500;
    color: rgba(255,255,255,0.75);
    text-decoration: none;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: block;
  }
  .mobile-menu-link:last-of-type { border: none; }
  .mobile-menu-link:hover { color: white; }
  .mobile-menu-cta { display: flex; gap: 10px; margin-top: 16px; }
  .mobile-menu-cta a { flex: 1; justify-content: center; }

  @media (max-width: 768px) {
    .nav-links { display: none; }
    .nav-cta { display: none; }
    .nav-hamburger { display: flex; }
    .hero-h1 { font-size: 38px; letter-spacing: -0.8px; }
    .hero-sub { font-size: 16px; }
  }
`;

const BENEFITS = [
  {
    icon: Clock,
    color: '#dbeafe',
    iconColor: '#3b82f6',
    title: 'Save hours every week',
    desc: 'Automate the manual work — scheduling reminders, application reviews, and status updates happen automatically so you can focus on your mission.',
  },
  {
    icon: Users,
    color: '#d1fae5',
    iconColor: '#10b981',
    title: 'One place for everything',
    desc: 'Volunteer profiles, event schedules, applications, and communication all live in a single organized platform. No more spreadsheets.',
  },
  {
    icon: Bell,
    color: '#fef3c7',
    iconColor: '#f59e0b',
    title: 'Keep everyone in the loop',
    desc: 'Send targeted messages, event reminders, and updates to your whole team or specific groups — all without leaving the platform.',
  },
  {
    icon: TrendingUp,
    color: '#ede9fe',
    iconColor: '#8b5cf6',
    title: 'Grow with confidence',
    desc: 'Track hours, participation rates, and engagement trends. Know exactly how your volunteer program is performing at every stage.',
  },
];

const USE_CASES = [
  {
    id: 'nonprofits',
    label: 'Nonprofits',
    headline: 'Scale your impact without scaling your overhead',
    body: "Whether you're running food drives, mentorship programs, or community outreach — VolunteerFlow gives you the tools to coordinate large volunteer teams without the chaos. Onboard new volunteers fast, track participation, and report your impact with ease.",
    stats: [
      { val: '73%', label: 'less time spent on admin' },
      { val: '2×', label: 'faster volunteer onboarding' },
      { val: '100%', label: 'audit-ready reporting' },
    ],
  },
  {
    id: 'events',
    label: 'Event Teams',
    headline: 'Run flawless events with a coordinated volunteer team',
    body: 'Managing event-day volunteers across multiple shifts, roles, and locations is a logistical challenge. VolunteerFlow handles shift scheduling, check-ins, communications, and real-time updates — so your team shows up prepared and your event runs smoothly.',
    stats: [
      { val: '50%', label: 'fewer no-shows' },
      { val: '3min', label: 'average check-in time' },
      { val: '0', label: 'missed communications' },
    ],
  },
  {
    id: 'schools',
    label: 'Schools & Churches',
    headline: 'Build a thriving volunteer community',
    body: 'Schools and faith communities rely on deeply engaged, trusted volunteers. VolunteerFlow makes it easy to manage background checks, certifications, recurring schedules, and communication — all within a platform your entire community will love using.',
    stats: [
      { val: '4.9★', label: 'avg volunteer satisfaction' },
      { val: '60%', label: 'higher volunteer retention' },
      { val: '15min', label: 'setup time' },
    ],
  },
];

const FEATURES = [
  { icon: Users, color: '#d1fae5', iconColor: '#10b981', title: 'Volunteer database', desc: 'Centralized profiles with skills, certifications, availability, and full history. Search, filter, and segment your team instantly.' },
  { icon: Calendar, color: '#dbeafe', iconColor: '#3b82f6', title: 'Event scheduling & shifts', desc: 'Create multi-shift events, set capacity limits, and let volunteers self-register. Handle waitlists and last-minute changes effortlessly.' },
  { icon: MessageSquare, color: '#fef3c7', iconColor: '#f59e0b', title: 'Messaging & notifications', desc: 'Send targeted email blasts, event reminders, and status updates. Reach your whole team or specific groups with one click.' },
  { icon: FileText, color: '#ede9fe', iconColor: '#8b5cf6', title: 'Application & approval system', desc: 'Build custom application forms, review submissions, and approve or reject candidates — all with automated follow-up emails.' },
  { icon: BarChart2, color: '#fce7f3', iconColor: '#ec4899', title: 'Reporting & tracking', desc: 'Track volunteer hours, event attendance, and engagement metrics. Export reports for grant applications and board presentations.' },
];

const STEPS = [
  { num: '1', title: 'Set up your organization', desc: 'Create your account, customize your volunteer portal with your branding, and configure your application forms in under 15 minutes.' },
  { num: '2', title: 'Add volunteers and events', desc: 'Import existing volunteers or invite them to self-register. Create events with shifts, set capacities, and publish — volunteers can sign up instantly.' },
  { num: '3', title: 'Manage and track everything', desc: 'Review applications, send communications, track hours, and monitor performance from your central dashboard. Your team stays informed automatically.' },
];

const TESTIMONIALS = [
  {
    quote: "Before VolunteerFlow, coordinating 200 volunteers for our annual food drive was an absolute nightmare — spreadsheets everywhere, emails getting lost, people showing up for the wrong shift. Now it runs itself. I actually enjoy the event.",
    author: 'Keisha M.',
    role: 'Volunteer Coordinator, City Harvest Alliance',
    avatar: 'KM', color: '#10b981',
  },
  {
    quote: "We went from 40 to 180 active volunteers in one year. VolunteerFlow made that growth manageable. The onboarding flow, the automated reminders, the reporting — it's everything we needed and more.",
    author: 'Pastor Daniel R.',
    role: 'Community Engagement Director, Grace Community Church',
    avatar: 'DR', color: '#3b82f6',
  },
  {
    quote: "As a school district running after-school programs across 12 campuses, we needed something that could handle scale and complexity. VolunteerFlow delivered. Our team saves about 20 hours a week.",
    author: 'Sandra T.',
    role: 'Program Director, Lincoln Unified School District',
    avatar: 'ST', color: '#8b5cf6',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('nonprofits');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeCase = USE_CASES.find((u) => u.id === activeTab)!;

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Nav */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/landing" className="nav-logo">
          <div className="nav-logo-mark">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="nav-logo-text">VolunteerFlow</span>
        </a>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="/pricing" className="nav-link">Pricing</a>
        </div>
        <div className="nav-cta">
          <a href="/auth" className="btn-nav-secondary">Sign in</a>
          <a href="/signup" className="btn-nav-primary">
            Start free <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <button className="nav-hamburger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">
          {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileMenu && (
        <div className="mobile-menu">
          <a href="#features" className="mobile-menu-link" onClick={() => setMobileMenu(false)}>Features</a>
          <a href="#how-it-works" className="mobile-menu-link" onClick={() => setMobileMenu(false)}>How it works</a>
          <a href="/pricing" className="mobile-menu-link" onClick={() => setMobileMenu(false)}>Pricing</a>
          <div className="mobile-menu-cta">
            <a href="/auth" className="btn-nav-secondary">Sign in</a>
            <a href="/signup" className="btn-nav-primary">
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero-bg" style={{ paddingTop: 140, paddingBottom: 100 }}>
        <div className="hero-mesh" />
        <div className="hero-grid" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <div className="hero-badge fade-up">
                <div className="hero-badge-dot" />
                New: Advanced analytics & team groups now available
              </div>
              <h1 className="hero-h1 fade-up-1">
                Volunteer management,<br />
                <em>finally simplified</em>
              </h1>
              <p className="hero-sub fade-up-2">
                VolunteerFlow helps nonprofits, schools, and event teams organize volunteers, manage events, and automate communication — all in one place.
              </p>
              <div className="hero-actions fade-up-3">
                <a href="/signup" className="btn-hero-primary">
                  Start free trial <ArrowRight className="w-4 h-4" />
                </a>
                <a href="/pricing" className="btn-hero-secondary">
                  View pricing
                </a>
              </div>
              <div className="hero-microcopy">
                {['No credit card required', 'Free 30-day trial', 'Setup in 15 minutes'].map((t) => (
                  <div key={t} className="hero-micro-item">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="dashboard-mockup fade-up-2" style={{ maxWidth: 480 }}>
              <div className="mockup-bar">
                <div className="mockup-dot" style={{ background: '#ef4444' }} />
                <div className="mockup-dot" style={{ background: '#f59e0b' }} />
                <div className="mockup-dot" style={{ background: '#10b981' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>VolunteerFlow Dashboard</span>
                </div>
              </div>
              <div className="mockup-body">
                <div className="mockup-stat-row">
                  {[
                    { val: '1,247', label: 'Volunteers', trend: '+12% this month' },
                    { val: '48', label: 'Active Events', trend: '8 this week' },
                    { val: '8,456', label: 'Hours Logged', trend: '+18% vs last month' },
                  ].map((s) => (
                    <div key={s.label} className="mockup-stat">
                      <div className="mockup-stat-val">{s.val}</div>
                      <div className="mockup-stat-label">{s.label}</div>
                      <div className="mockup-stat-trend">{s.trend}</div>
                    </div>
                  ))}
                </div>
                <div className="mockup-list">
                  <div className="mockup-list-title">Recent Applications</div>
                  {[
                    { name: 'Sarah Johnson', event: 'Food Bank Drive', status: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.15)', av: 'SJ', avc: '#059669' },
                    { name: 'Marcus T.', event: 'Community Cleanup', status: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', av: 'MT', avc: '#b45309' },
                    { name: 'Emily Davis', event: 'Youth Mentorship', status: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.15)', av: 'ED', avc: '#0d9488' },
                    { name: 'James W.', event: 'Senior Center', status: 'Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', av: 'JW', avc: '#1d4ed8' },
                  ].map((r) => (
                    <div key={r.name} className="mockup-row">
                      <div className="mockup-avatar" style={{ background: r.avc }}>{r.av}</div>
                      <div className="mockup-name">{r.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{r.event}</div>
                      <div className="mockup-badge" style={{ color: r.color, background: r.bg }}>{r.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Benefits */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-eyebrow">
              <Zap className="w-3 h-3" /> Why teams choose VolunteerFlow
            </div>
            <h2 className="section-h2">Built for the way <em>real organizations</em> work</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              We talked to hundreds of volunteer coordinators to understand exactly where the pain is. Then we built the solution.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="benefit-card">
                  <div className="benefit-icon" style={{ background: b.color }}>
                    <Icon className="w-6 h-6" style={{ color: b.iconColor }} />
                  </div>
                  <div className="benefit-title">{b.title}</div>
                  <div className="benefit-desc">{b.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div style={{ marginBottom: 48 }}>
            <div className="section-eyebrow">
              <Heart className="w-3 h-3" /> Built for your organization
            </div>
            <h2 className="section-h2">The right tool for <em>every mission</em></h2>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 40, flexWrap: 'wrap' }}>
            {USE_CASES.map((u) => (
              <button key={u.id} className={`usecase-tab ${activeTab === u.id ? 'active' : ''}`} onClick={() => setActiveTab(u.id)}>
                {u.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <h3 className="lp-display" style={{ fontSize: 28, fontWeight: 600, color: '#0f172a', marginBottom: 16, lineHeight: 1.25 }}>
                {activeCase.headline}
              </h3>
              <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
                {activeCase.body}
              </p>
              <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
                {activeCase.stats.map((s) => (
                  <div key={s.label}>
                    <div className="lp-display" style={{ fontSize: 28, fontWeight: 600, color: '#10b981' }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <a href="/signup" className="btn-primary">
                Get started free <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>
                What {activeCase.label} love most
              </div>
              {['Volunteer self-service portal', 'Automated email reminders', 'Custom application forms', 'Real-time reporting', 'Role-based permissions'].map((f, i) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features" style={{ background: 'white' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 100 }}>
              <div className="section-eyebrow">
                <Settings className="w-3 h-3" /> Platform features
              </div>
              <h2 className="section-h2">Everything your team <em>actually needs</em></h2>
              <p className="section-sub" style={{ marginBottom: 32 }}>
                No bloated feature lists. Just the tools that matter for running a volunteer program effectively.
              </p>
              <a href="/signup" className="btn-primary">
                Explore all features <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="feature-item">
                    <div className="feature-icon-wrap" style={{ background: f.color }}>
                      <Icon className="w-5 h-5" style={{ color: f.iconColor }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{f.title}</div>
                      <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how-it-works" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-eyebrow">
              <Zap className="w-3 h-3" /> Get started in minutes
            </div>
            <h2 className="section-h2">Three steps to a <em>better-run</em> program</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                  <div className="step-num lp-display">{s.num}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: '100%', height: 1, background: '#e2e8f0', marginTop: 24, position: 'relative' }}>
                      <div style={{ position: 'absolute', right: -12, top: -6, color: '#d1d5db', fontSize: 12 }}>→</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <a href="/signup" className="btn-primary" style={{ fontSize: 16 }}>
              Start your free trial <ArrowRight className="w-4 h-4" />
            </a>
            <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>No credit card required · Set up in 15 minutes</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">
              <Star className="w-3 h-3" /> Real stories
            </div>
            <h2 className="section-h2">Organizations that <em>transformed</em> their programs</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="testimonial-card">
                <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                  ))}
                </div>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="testimonial-author">{t.author}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-bg" style={{ padding: '96px 0' }}>
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 className="lp-display" style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, color: 'white', letterSpacing: -1, lineHeight: 1.1, marginBottom: 20 }}>
            Ready to simplify your<br />
            <em style={{ color: '#10b981' }}>volunteer program?</em>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 480, margin: '0 auto 40px' }}>
            Join 4,000+ organizations already saving time and making more impact with VolunteerFlow.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href="/signup" className="btn-hero-primary" style={{ fontSize: 16 }}>
              Start free trial <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/pricing" className="btn-hero-secondary" style={{ fontSize: 16 }}>
              View pricing
            </a>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Free 30 days · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" style={{ padding: '60px 0 32px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <a href="/landing" className="nav-logo" style={{ marginBottom: 16, display: 'flex' }}>
                <div className="nav-logo-mark" style={{ marginRight: 10 }}>
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="nav-logo-text">VolunteerFlow</span>
              </a>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 260 }}>
                The volunteer management platform built for organizations that want to make a bigger impact.
              </p>
            </div>
            <div>
              <div className="footer-col-title">Product</div>
              <a href="#features" className="footer-link">Features</a>
              <a href="/pricing" className="footer-link">Pricing</a>
              {['Integrations', 'Changelog'].map((l) => (
                <a key={l} href="#" className="footer-link">{l}</a>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Company</div>
              {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                <a key={l} href="#" className="footer-link">{l}</a>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Support</div>
              {['Documentation', 'Help Center', 'Status', 'Terms', 'Privacy'].map((l) => (
                <a key={l} href="#" className="footer-link">{l}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
              © 2024 VolunteerFlow. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'Cookies'].map((l) => (
                <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
