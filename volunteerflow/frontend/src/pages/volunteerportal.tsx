import { useState } from "react";

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

  .vp *, .vp *::before, .vp *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .vp {
    --sun: #f5a623;
    --sun-light: #fde8b8;
    --sun-pale: #fef7e8;
    --sky: #3b82f6;
    --sky-light: #dbeafe;
    --leaf: #22863a;
    --leaf-light: #dcfce7;
    --coral: #e85d4a;
    --coral-light: #fee2de;
    --ink: #1a1a2e;
    --ink-mid: #3d3d5c;
    --ink-soft: #7c7c9e;
    --ink-faint: #b8b8d0;
    --bg: #f8f7ff;
    --surface: #ffffff;
    --border: #e8e8f0;
    --border-focus: #3b82f6;
    --shadow-xs: 0 1px 2px rgba(26,26,46,0.06);
    --shadow-sm: 0 2px 8px rgba(26,26,46,0.08);
    --shadow-md: 0 4px 20px rgba(26,26,46,0.10);
    --shadow-lg: 0 8px 40px rgba(26,26,46,0.12);
    --r-sm: 10px;
    --r-md: 16px;
    --r-lg: 22px;
    --r-xl: 28px;
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
  }

  /* ── LOGIN ── */
  .vp-login {
    min-height: 100vh; display: flex; align-items: stretch;
    background: var(--bg); position: relative; overflow: hidden;
  }
  .vp-login-art {
    width: 480px; flex-shrink: 0; background: var(--ink);
    position: relative; overflow: hidden; display: flex; flex-direction: column;
    justify-content: flex-end; padding: 56px 52px;
  }
  .login-art-circles {
    position: absolute; inset: 0; pointer-events: none;
  }
  .login-art-circle {
    position: absolute; border-radius: 50%; opacity: 0.12;
  }
  .lac-1 { width: 500px; height: 500px; background: var(--sun); top: -180px; left: -120px; }
  .lac-2 { width: 300px; height: 300px; background: var(--sky); bottom: 80px; right: -80px; opacity: 0.15; }
  .lac-3 { width: 180px; height: 180px; background: var(--coral); top: 40%; left: 30%; opacity: 0.08; }
  .login-art-dots {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .login-art-tag {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 99px; padding: 6px 14px; font-size: 12px; font-weight: 600;
    color: rgba(255,255,255,0.7); letter-spacing: 0.5px; text-transform: uppercase;
    margin-bottom: 24px; width: fit-content; position: relative; z-index: 1;
  }
  .login-art-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sun); }
  .login-art-title {
    font-family: 'Fraunces', serif; font-size: 44px; font-weight: 400;
    color: white; line-height: 1.15; letter-spacing: -1px; margin-bottom: 20px;
    position: relative; z-index: 1;
  }
  .login-art-title em { color: var(--sun); font-style: italic; }
  .login-art-desc {
    color: rgba(255,255,255,0.55); font-size: 15px; line-height: 1.65;
    position: relative; z-index: 1; margin-bottom: 40px;
  }
  .login-art-stats {
    display: flex; gap: 32px; position: relative; z-index: 1;
    padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1);
  }
  .login-art-stat-val {
    font-family: 'Fraunces', serif; font-size: 28px; font-weight: 400; color: white;
  }
  .login-art-stat-label { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 500; margin-top: 2px; }

  .vp-login-form-wrap {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 48px 40px; position: relative;
  }
  .vp-login-form-wrap::before {
    content: ''; position: absolute; top: -100px; right: -100px;
    width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, var(--sun-pale) 0%, transparent 70%);
    pointer-events: none;
  }
  .vp-login-card { width: 100%; max-width: 420px; position: relative; z-index: 1; }
  .vp-login-logo {
    display: flex; align-items: center; gap: 10px; margin-bottom: 40px;
  }
  .vp-login-logo-mark {
    width: 38px; height: 38px; background: var(--ink); border-radius: 10px;
    display: flex; align-items: center; justify-content: center; color: var(--sun);
    font-family: 'Fraunces', serif; font-size: 18px; font-weight: 400;
  }
  .vp-login-logo-text {
    font-family: 'Fraunces', serif; font-size: 18px; font-weight: 400;
    color: var(--ink); letter-spacing: -0.3px;
  }
  .vp-login-logo-text span { color: var(--sun); }
  .vp-login-heading {
    font-family: 'Fraunces', serif; font-size: 32px; font-weight: 400;
    color: var(--ink); letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 8px;
  }
  .vp-login-sub { color: var(--ink-soft); font-size: 15px; line-height: 1.55; margin-bottom: 32px; }
  .vp-notice {
    background: var(--sun-pale); border: 1px solid var(--sun-light); border-radius: var(--r-sm);
    padding: 13px 16px; font-size: 13px; color: var(--ink-mid); line-height: 1.55;
    margin-bottom: 28px; display: flex; gap: 10px; align-items: flex-start;
  }
  .vp-notice-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

  /* ── FORM ELEMENTS ── */
  .vp-field { margin-bottom: 18px; }
  .vp-label { display: block; font-size: 13px; font-weight: 600; color: var(--ink-mid); margin-bottom: 7px; }
  .vp-input-wrap { position: relative; }
  .vp-input {
    width: 100%; padding: 13px 16px; border: 1.5px solid var(--border);
    border-radius: var(--r-sm); font-family: 'Outfit', sans-serif; font-size: 14.5px;
    color: var(--ink); background: var(--surface); outline: none; appearance: none;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .vp-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  .vp-input::placeholder { color: var(--ink-faint); }
  .vp-input.is-error { border-color: var(--coral); box-shadow: 0 0 0 3px rgba(232,93,74,0.10); }
  .vp-input-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--ink-soft);
    padding: 4px; display: flex; align-items: center;
  }
  .vp-field-error { color: var(--coral); font-size: 12px; margin-top: 5px; font-weight: 500; }
  .vp-forgot-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
  .vp-forgot-btn {
    background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 13px;
    color: var(--sky); cursor: pointer; font-weight: 500; padding: 0;
    text-decoration: underline; text-underline-offset: 2px;
  }

  /* ── BUTTONS ── */
  .vp-btn {
    width: 100%; padding: 14px 24px; background: var(--ink); color: white; border: none;
    border-radius: var(--r-sm); font-family: 'Outfit', sans-serif; font-size: 15px;
    font-weight: 600; cursor: pointer; transition: background 0.18s, transform 0.1s, box-shadow 0.18s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 2px 8px rgba(26,26,46,0.18);
  }
  .vp-btn:hover { background: var(--ink-mid); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .vp-btn:active { transform: translateY(0); }
  .vp-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .vp-btn-sun { background: var(--sun); color: var(--ink); box-shadow: 0 2px 8px rgba(245,166,35,0.30); }
  .vp-btn-sun:hover { background: #e8971a; box-shadow: 0 4px 16px rgba(245,166,35,0.35); }
  .vp-btn-outline {
    background: transparent; color: var(--ink); border: 1.5px solid var(--border);
    box-shadow: none;
  }
  .vp-btn-outline:hover { background: var(--bg); border-color: var(--ink-faint); transform: none; box-shadow: none; }
  .vp-btn-sm { padding: 9px 18px; font-size: 13.5px; width: auto; }
  .vp-btn-coral { background: var(--coral); color: white; box-shadow: 0 2px 8px rgba(232,93,74,0.25); }
  .vp-btn-coral:hover { background: #d44d3a; }
  .vp-btn-ghost { background: none; border: none; color: var(--ink-soft); cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 14px; padding: 8px 12px; border-radius: var(--r-sm); transition: background 0.15s, color 0.15s; width: auto; box-shadow: none; }
  .vp-btn-ghost:hover { background: var(--border); color: var(--ink); transform: none; box-shadow: none; }

  /* ── SHELL / NAV ── */
  .vp-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
  .vp-topbar {
    height: 60px; background: var(--surface); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px; gap: 16px;
    position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow-xs);
  }
  .vp-topbar-logo {
    display: flex; align-items: center; gap: 8px; text-decoration: none; margin-right: auto;
  }
  .vp-topbar-logo-mark {
    width: 32px; height: 32px; background: var(--ink); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; color: var(--sun);
    font-family: 'Fraunces', serif; font-size: 15px;
  }
  .vp-topbar-logo-text {
    font-family: 'Fraunces', serif; font-size: 16px; color: var(--ink); font-weight: 400;
  }
  .vp-topbar-logo-text span { color: var(--sun); }
  .vp-topbar-vol-tag {
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    color: var(--ink-soft); background: var(--bg); border: 1px solid var(--border);
    padding: 3px 9px; border-radius: 99px;
  }
  .vp-avatar {
    width: 34px; height: 34px; border-radius: 50%; background: var(--sun-light);
    display: flex; align-items: center; justify-content: center; font-weight: 700;
    font-size: 13px; color: var(--ink); cursor: pointer; flex-shrink: 0;
    border: 2px solid var(--border);
  }

  /* ── BOTTOM NAV (mobile-first) ── */
  .vp-bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; height: 64px;
    background: var(--surface); border-top: 1px solid var(--border);
    display: flex; align-items: stretch; z-index: 100; box-shadow: 0 -4px 20px rgba(26,26,46,0.08);
  }
  .vp-nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; cursor: pointer; background: none; border: none; font-family: 'Outfit', sans-serif;
    transition: color 0.15s; color: var(--ink-faint); padding: 8px 4px;
  }
  .vp-nav-item.is-active { color: var(--ink); }
  .vp-nav-icon {
    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .vp-nav-indicator {
    position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
    width: 4px; height: 4px; border-radius: 50%; background: var(--sun);
  }
  .vp-nav-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px; }

  /* ── CONTENT AREA ── */
  .vp-content { flex: 1; padding: 24px 20px 88px; max-width: 680px; margin: 0 auto; width: 100%; }

  /* ── HOME ── */
  .vp-hero {
    background: var(--ink); border-radius: var(--r-lg); padding: 28px 24px;
    margin-bottom: 20px; position: relative; overflow: hidden;
  }
  .vp-hero::before {
    content: ''; position: absolute; top: -60px; right: -60px;
    width: 200px; height: 200px; border-radius: 50%;
    background: radial-gradient(circle, rgba(245,166,35,0.25) 0%, transparent 70%);
    pointer-events: none;
  }
  .vp-hero::after {
    content: ''; position: absolute; bottom: -40px; left: -40px;
    width: 160px; height: 160px; border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .vp-hero-greeting { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); margin-bottom: 6px; letter-spacing: 0.2px; }
  .vp-hero-name {
    font-family: 'Fraunces', serif; font-size: 28px; font-weight: 400;
    color: white; letter-spacing: -0.5px; margin-bottom: 20px; line-height: 1.2; position: relative; z-index: 1;
  }
  .vp-hero-name em { color: var(--sun); font-style: italic; }
  .vp-hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; position: relative; z-index: 1; }
  .vp-hero-stat {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09);
    border-radius: var(--r-sm); padding: 14px 12px; text-align: center;
  }
  .vp-hero-stat-val { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 400; color: white; }
  .vp-hero-stat-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 500; margin-top: 3px; }

  .vp-section-title {
    font-family: 'Fraunces', serif; font-size: 20px; font-weight: 400;
    color: var(--ink); letter-spacing: -0.3px; margin-bottom: 14px;
  }
  .vp-section-title span { color: var(--sun); font-style: italic; }

  /* ── EVENT CARDS ── */
  .vp-event-card {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r-md);
    padding: 20px; margin-bottom: 14px; box-shadow: var(--shadow-xs);
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
    position: relative; overflow: hidden;
  }
  .vp-event-card:hover { border-color: var(--ink-faint); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
  .vp-event-card.is-signed-up { border-color: var(--leaf); }
  .vp-event-card.is-full { opacity: 0.7; }
  .vp-event-card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--sun), var(--coral));
    border-radius: var(--r-md) var(--r-md) 0 0;
  }
  .vp-event-card-accent.is-signed { background: linear-gradient(90deg, var(--leaf), var(--sky)); }
  .vp-event-card-accent.is-past { background: var(--border); }
  .vp-event-card-top { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
  .vp-event-date-block {
    background: var(--sun-pale); border: 1px solid var(--sun-light); border-radius: var(--r-sm);
    padding: 10px 12px; text-align: center; flex-shrink: 0; min-width: 54px;
  }
  .vp-event-date-block.is-past { background: var(--bg); border-color: var(--border); }
  .vp-event-date-month { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-soft); }
  .vp-event-date-day { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400; color: var(--ink); line-height: 1; }
  .vp-event-title { font-size: 16px; font-weight: 600; color: var(--ink); margin-bottom: 4px; line-height: 1.3; }
  .vp-event-meta { display: flex; flex-wrap: wrap; gap: 10px; }
  .vp-event-meta-item { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--ink-soft); font-weight: 500; }
  .vp-event-desc { font-size: 13.5px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 16px; }
  .vp-event-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .vp-spots-bar { flex: 1; min-width: 120px; }
  .vp-spots-label { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin-bottom: 5px; }
  .vp-spots-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .vp-spots-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--sun), var(--coral)); transition: width 0.3s; }
  .vp-spots-fill.is-full { background: var(--coral); }
  .vp-spots-fill.is-ok { background: var(--leaf); }

  /* SIGNED UP badge */
  .vp-signed-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--leaf-light); color: var(--leaf); border-radius: 99px;
    padding: 5px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.2px;
  }
  .vp-full-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--coral-light); color: var(--coral); border-radius: 99px;
    padding: 5px 12px; font-size: 12px; font-weight: 700;
  }
  .vp-past-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--bg); color: var(--ink-soft); border-radius: 99px;
    padding: 5px 12px; font-size: 12px; font-weight: 700; border: 1px solid var(--border);
  }

  /* ── TABS ── */
  .vp-sub-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
  .vp-sub-tab {
    padding: 8px 18px; border-radius: 99px; font-size: 13.5px; font-weight: 600;
    cursor: pointer; background: none; border: 1.5px solid var(--border);
    color: var(--ink-soft); font-family: 'Outfit', sans-serif; transition: all 0.15s;
  }
  .vp-sub-tab.is-active { background: var(--ink); color: white; border-color: var(--ink); }

  /* ── PROFILE ── */
  .vp-profile-hero {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r-lg);
    padding: 28px 24px; margin-bottom: 16px; box-shadow: var(--shadow-xs);
    display: flex; flex-direction: column; align-items: center; text-align: center;
  }
  .vp-profile-avatar-wrap { position: relative; margin-bottom: 16px; }
  .vp-profile-avatar {
    width: 84px; height: 84px; border-radius: 50%; background: var(--sun-light);
    display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif;
    font-size: 32px; font-weight: 400; color: var(--ink); border: 3px solid var(--surface);
    box-shadow: var(--shadow-sm);
  }
  .vp-profile-avatar-edit {
    position: absolute; bottom: 0; right: 0; width: 26px; height: 26px;
    background: var(--ink); border-radius: 50%; display: flex; align-items: center;
    justify-content: center; cursor: pointer; border: 2px solid white;
    color: white; font-size: 11px;
  }
  .vp-profile-name { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400; color: var(--ink); margin-bottom: 4px; }
  .vp-profile-email { font-size: 14px; color: var(--ink-soft); }
  .vp-profile-since { font-size: 12px; color: var(--ink-faint); margin-top: 8px; font-weight: 500; }

  .vp-form-card {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r-md);
    padding: 22px 20px; margin-bottom: 14px; box-shadow: var(--shadow-xs);
  }
  .vp-form-card-title { font-size: 14px; font-weight: 700; color: var(--ink); margin-bottom: 18px; letter-spacing: 0.1px; }
  .vp-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* ── EMPTY STATE ── */
  .vp-empty {
    text-align: center; padding: 48px 24px; background: var(--surface);
    border: 1.5px dashed var(--border); border-radius: var(--r-lg); margin-bottom: 14px;
  }
  .vp-empty-icon { font-size: 40px; margin-bottom: 14px; }
  .vp-empty-title { font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); margin-bottom: 8px; }
  .vp-empty-desc { font-size: 14px; color: var(--ink-soft); line-height: 1.6; }

  /* ── TOAST ── */
  .vp-toast {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: var(--ink); color: white; border-radius: var(--r-sm);
    padding: 12px 20px; font-size: 14px; font-weight: 500; z-index: 200;
    box-shadow: var(--shadow-lg); display: flex; align-items: center; gap: 8px;
    animation: vp-toast-in 0.3s ease;
    white-space: nowrap;
  }
  @keyframes vp-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* ── ANIMATIONS ── */
  @keyframes vp-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .vp-up { animation: vp-up 0.35s ease both; }
  .vp-up-1 { animation: vp-up 0.35s ease 0.05s both; }
  .vp-up-2 { animation: vp-up 0.35s ease 0.1s both; }
  .vp-up-3 { animation: vp-up 0.35s ease 0.15s both; }

  /* ── RESPONSIVE ── */
  @media (max-width: 760px) {
    .vp-login-art { display: none; }
    .vp-form-row { grid-template-columns: 1fr; }
  }
  @media (min-width: 760px) {
    .vp-content { padding: 32px 24px 88px; }
    .vp-hero { padding: 32px 28px; }
    .vp-hero-name { font-size: 34px; }
  }
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────

const Icon = ({ children, size = 18 }: { children: string; size?: number }) => (
  <span style={{ fontSize: size, lineHeight: 1, display: "inline-flex" }}>{children}</span>
);

// ─── DATA ─────────────────────────────────────────────────────────────────────

const MOCK_VOLUNTEER = { name: "Maria González", email: "maria@example.org", phone: "(555) 012-3456", since: "March 2024", initials: "MG" };

const MOCK_EVENTS = [
  { id: 1, title: "Community Garden Restoration", month: "JUL", day: "14", time: "9:00 AM – 1:00 PM", location: "Riverside Park, Block C", desc: "Help restore our community garden — planting, weeding, and building new raised beds. No experience needed, gloves provided!", needed: 20, signups: 14, category: "Environment" },
  { id: 2, title: "Senior Center Lunch Program", month: "JUL", day: "18", time: "11:00 AM – 2:00 PM", location: "Oakwood Senior Center", desc: "Assist with meal preparation and service for local seniors. A wonderful opportunity to connect with the community.", needed: 8, signups: 8, category: "Care" },
  { id: 3, title: "Youth Coding Workshop", month: "JUL", day: "22", time: "10:00 AM – 4:00 PM", location: "Central Library, Room 3B", desc: "Help teach kids ages 10–14 the basics of coding with Scratch and Python. Beginner-friendly curriculum provided.", needed: 6, signups: 3, category: "Education" },
  { id: 4, title: "Food Bank Sorting Day", month: "AUG", day: "02", time: "8:00 AM – 12:00 PM", location: "Downtown Food Bank", desc: "Sort and pack donated food items for distribution across the city. Physical activity involved — wear comfortable clothing.", needed: 25, signups: 11, category: "Community" },
  { id: 5, title: "Park Trail Cleanup", month: "AUG", day: "09", time: "7:30 AM – 11:00 AM", location: "Greenwood Trail Head", desc: "Join us for a morning cleanup of the park trail. Trash bags and gloves provided.", needed: 15, signups: 15, category: "Environment" },
];

const PAST_EVENTS = [
  { id: 101, title: "Spring Food Drive", month: "MAY", day: "10", time: "9:00 AM – 1:00 PM", location: "Community Center", desc: "Helped sort and pack over 800 lbs of food donations.", hours: 4 },
  { id: 102, title: "Youth Mentorship Kickoff", month: "JUN", day: "03", time: "2:00 PM – 5:00 PM", location: "West Side Library", desc: "Introduced students to our summer mentorship program.", hours: 3 },
];

// ─── EYE ICON ─────────────────────────────────────────────────────────────────

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1100);
  };

  return (
    <div className="vp-login">
      <div className="vp-login-art">
        <div className="login-art-circles">
          <div className="login-art-circle lac-1" />
          <div className="login-art-circle lac-2" />
          <div className="login-art-circle lac-3" />
        </div>
        <div className="login-art-dots" />
        <div className="login-art-tag"><div className="login-art-dot" /> Volunteer Portal</div>
        <h1 className="login-art-title">Make a<br /><em>real</em> difference<br />in your community.</h1>
        <p className="login-art-desc">Sign in to access your upcoming events, track your hours, and connect with your nonprofit team.</p>
        <div className="login-art-stats">
          <div>
            <div className="login-art-stat-val">3,200+</div>
            <div className="login-art-stat-label">Active volunteers</div>
          </div>
          <div>
            <div className="login-art-stat-val">48k</div>
            <div className="login-art-stat-label">Hours contributed</div>
          </div>
          <div>
            <div className="login-art-stat-val">890</div>
            <div className="login-art-stat-label">Events completed</div>
          </div>
        </div>
      </div>

      <div className="vp-login-form-wrap">
        <div className="vp-login-card">
          <div className="vp-login-logo">
            <div className="vp-login-logo-mark">V</div>
            <span className="vp-login-logo-text">Volunteer<span>Flow</span></span>
          </div>
          <h2 className="vp-login-heading vp-up">Welcome back</h2>
          <p className="vp-login-sub vp-up-1">Sign in to your volunteer account to get started.</p>

          <div className="vp-notice vp-up-1">
            <span className="vp-notice-icon">ℹ️</span>
            <span>Volunteer accounts are created automatically after your application is reviewed and approved by the organization.</span>
          </div>

          <div className="vp-field vp-up-2">
            <label className="vp-label">Email Address</label>
            <input
              className={`vp-input${errors.email ? " is-error" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {errors.email && <div className="vp-field-error">{errors.email}</div>}
          </div>

          <div className="vp-field vp-up-2">
            <div className="vp-forgot-row">
              <label className="vp-label" style={{ margin: 0 }}>Password</label>
              <button className="vp-forgot-btn" type="button">Forgot password?</button>
            </div>
            <div className="vp-input-wrap">
              <input
                className={`vp-input${errors.password ? " is-error" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button className="vp-input-btn" type="button" onClick={() => setShowPw(v => !v)}>
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password && <div className="vp-field-error">{errors.password}</div>}
          </div>

          <button className="vp-btn vp-btn-sun vp-up-3" type="button" onClick={submit} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="vp-topbar">
      <div className="vp-topbar-logo">
        <div className="vp-topbar-logo-mark">V</div>
        <span className="vp-topbar-logo-text">Volunteer<span>Flow</span></span>
      </div>
      <div className="vp-topbar-vol-tag">Volunteer</div>
      <div className="vp-avatar" title={MOCK_VOLUNTEER.name}>{MOCK_VOLUNTEER.initials}</div>
      <button className="vp-btn-ghost" style={{ fontSize: 13, padding: "6px 10px" }} onClick={onLogout}>Sign out</button>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

type Tab = "home" | "events" | "myevents" | "profile";

function BottomNav({ tab, setTab, myCount }: { tab: Tab; setTab: (t: Tab) => void; myCount: number }) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "events", icon: "📅", label: "Sign Up" },
    { id: "myevents", icon: "✅", label: "My Events" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  return (
    <div className="vp-bottom-nav">
      {items.map(item => (
        <button key={item.id} className={`vp-nav-item${tab === item.id ? " is-active" : ""}`} onClick={() => setTab(item.id)}>
          <div className="vp-nav-icon">
            <Icon size={22}>{item.icon}</Icon>
            {tab === item.id && <div className="vp-nav-indicator" />}
            {item.id === "myevents" && myCount > 0 && tab !== "myevents" && (
              <div style={{ position: "absolute", top: -4, right: -6, background: "var(--coral)", color: "white", fontSize: 9, fontWeight: 700, borderRadius: 99, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{myCount}</div>
            )}
          </div>
          <span className="vp-nav-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── HOME TAB ────────────────────────────────────────────────────────────────

function HomeTab({ myEvents, setTab }: { myEvents: number[]; setTab: (t: Tab) => void }) {
  const upcoming = MOCK_EVENTS.filter(e => myEvents.includes(e.id)).slice(0, 2);
  const totalHours = PAST_EVENTS.reduce((s, e) => s + e.hours, 0);
  return (
    <div>
      <div className="vp-hero vp-up">
        <div className="vp-hero-greeting">Good morning 👋</div>
        <div className="vp-hero-name">Hello, <em>{MOCK_VOLUNTEER.name.split(" ")[0]}</em></div>
        <div className="vp-hero-stats">
          <div className="vp-hero-stat">
            <div className="vp-hero-stat-val">{myEvents.length}</div>
            <div className="vp-hero-stat-label">Upcoming</div>
          </div>
          <div className="vp-hero-stat">
            <div className="vp-hero-stat-val">{PAST_EVENTS.length}</div>
            <div className="vp-hero-stat-label">Completed</div>
          </div>
          <div className="vp-hero-stat">
            <div className="vp-hero-stat-val">{totalHours}h</div>
            <div className="vp-hero-stat-label">Hours given</div>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="vp-up-1">
          <div className="vp-section-title">Your <span>next</span> events</div>
          {upcoming.map(ev => (
            <MiniEventCard key={ev.id} event={ev} />
          ))}
          {myEvents.length > 2 && (
            <button className="vp-btn vp-btn-outline" style={{ marginBottom: 20 }} onClick={() => setTab("myevents")}>
              View all {myEvents.length} events →
            </button>
          )}
        </div>
      )}

      <div className="vp-up-2">
        <div className="vp-section-title">Find <span>opportunities</span></div>
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", padding: "20px", boxShadow: "var(--shadow-xs)", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--ink)" }}>{MOCK_EVENTS.filter(e => !myEvents.includes(e.id) && e.signups < e.needed).length} events available to join</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 16 }}>Browse upcoming volunteer opportunities and sign up for events that fit your schedule.</div>
          <button className="vp-btn vp-btn-sun vp-btn-sm" type="button" onClick={() => setTab("events")}>Browse Events →</button>
        </div>
      </div>
    </div>
  );
}

function MiniEventCard({ event }: { event: typeof MOCK_EVENTS[0] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px 18px", marginBottom: 10, display: "flex", gap: 14, alignItems: "center", boxShadow: "var(--shadow-xs)" }}>
      <div className="vp-event-date-block" style={{ background: "var(--ink)", borderColor: "var(--ink)" }}>
        <div className="vp-event-date-month" style={{ color: "rgba(255,255,255,0.5)" }}>{event.month}</div>
        <div className="vp-event-date-day" style={{ color: "white" }}>{event.day}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>⏰ {event.time}</div>
      </div>
      <div className="vp-signed-badge">✓ Going</div>
    </div>
  );
}

// ─── EVENTS TAB ───────────────────────────────────────────────────────────────

function EventsTab({ myEvents, setMyEvents, showToast }: { myEvents: number[]; setMyEvents: (e: number[]) => void; showToast: (msg: string) => void }) {
  const signUp = (id: number) => {
    setMyEvents([...myEvents, id]);
    showToast("🎉 You're signed up!");
  };

  const spotsLeft = (ev: typeof MOCK_EVENTS[0]) => ev.needed - ev.signups - (myEvents.includes(ev.id) ? 0 : 0);
  const pct = (ev: typeof MOCK_EVENTS[0]) => Math.min(100, Math.round((ev.signups / ev.needed) * 100));

  return (
    <div>
      <div className="vp-section-title vp-up">Upcoming <span>Events</span></div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 20 }} className="vp-up-1">Find and sign up for volunteer opportunities near you.</p>

      {MOCK_EVENTS.map((ev, i) => {
        const signed = myEvents.includes(ev.id);
        const full = ev.signups >= ev.needed && !signed;
        const remaining = ev.needed - ev.signups;
        const fillPct = pct(ev);

        return (
          <div key={ev.id} className={`vp-event-card${signed ? " is-signed-up" : ""}${full ? " is-full" : ""}`} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`vp-event-card-accent${signed ? " is-signed" : ""}`} />
            <div className="vp-event-card-top">
              <div className="vp-event-date-block">
                <div className="vp-event-date-month">{ev.month}</div>
                <div className="vp-event-date-day">{ev.day}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="vp-event-title">{ev.title}</div>
                <div className="vp-event-meta">
                  <span className="vp-event-meta-item">⏰ {ev.time}</span>
                  <span className="vp-event-meta-item">📍 {ev.location}</span>
                  <span style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 99, fontSize: 11, fontWeight: 600, padding: "2px 9px", color: "var(--ink-soft)" }}>{ev.category}</span>
                </div>
              </div>
            </div>
            <div className="vp-event-desc">{ev.desc}</div>
            <div className="vp-event-footer">
              <div className="vp-spots-bar">
                <div className="vp-spots-label">
                  {full ? "Event full" : `${remaining} spot${remaining !== 1 ? "s" : ""} remaining`}
                </div>
                <div className="vp-spots-track">
                  <div className={`vp-spots-fill${full ? " is-full" : remaining > ev.needed * 0.4 ? " is-ok" : ""}`} style={{ width: `${fillPct}%` }} />
                </div>
              </div>
              {signed ? (
                <div className="vp-signed-badge">✓ Signed up</div>
              ) : full ? (
                <div className="vp-full-badge">🔒 Full</div>
              ) : (
                <button className="vp-btn vp-btn-sun vp-btn-sm" type="button" onClick={() => signUp(ev.id)}>
                  Sign Up
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MY EVENTS TAB ───────────────────────────────────────────────────────────

function MyEventsTab({ myEvents, setMyEvents, showToast }: { myEvents: number[]; setMyEvents: (e: number[]) => void; showToast: (msg: string) => void }) {
  const [subTab, setSubTab] = useState<"upcoming" | "past">("upcoming");

  const upcomingList = MOCK_EVENTS.filter(e => myEvents.includes(e.id));
  const cancel = (id: number) => {
    setMyEvents(myEvents.filter(e => e !== id));
    showToast("Signup cancelled");
  };

  return (
    <div>
      <div className="vp-section-title vp-up">My <span>Events</span></div>
      <div className="vp-sub-tabs vp-up-1">
        <button className={`vp-sub-tab${subTab === "upcoming" ? " is-active" : ""}`} onClick={() => setSubTab("upcoming")}>
          Upcoming ({upcomingList.length})
        </button>
        <button className={`vp-sub-tab${subTab === "past" ? " is-active" : ""}`} onClick={() => setSubTab("past")}>
          Past ({PAST_EVENTS.length})
        </button>
      </div>

      {subTab === "upcoming" && (
        upcomingList.length === 0 ? (
          <div className="vp-empty vp-up">
            <div className="vp-empty-icon">📭</div>
            <div className="vp-empty-title">No upcoming events yet</div>
            <div className="vp-empty-desc">Browse available opportunities and sign up for events that interest you.</div>
          </div>
        ) : (
          upcomingList.map((ev, i) => (
            <div key={ev.id} className="vp-event-card is-signed-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="vp-event-card-accent is-signed" />
              <div className="vp-event-card-top">
                <div className="vp-event-date-block">
                  <div className="vp-event-date-month">{ev.month}</div>
                  <div className="vp-event-date-day">{ev.day}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="vp-event-title">{ev.title}</div>
                  <div className="vp-event-meta">
                    <span className="vp-event-meta-item">⏰ {ev.time}</span>
                    <span className="vp-event-meta-item">📍 {ev.location}</span>
                  </div>
                </div>
              </div>
              <div className="vp-event-desc">{ev.desc}</div>
              <div className="vp-event-footer">
                <div className="vp-signed-badge">✓ You're going</div>
                <button className="vp-btn vp-btn-outline vp-btn-sm" type="button" onClick={() => cancel(ev.id)}
                  style={{ color: "var(--coral)", borderColor: "var(--coral-light)" }}>
                  Cancel signup
                </button>
              </div>
            </div>
          ))
        )
      )}

      {subTab === "past" && (
        PAST_EVENTS.map((ev, i) => (
          <div key={ev.id} className="vp-event-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="vp-event-card-accent is-past" />
            <div className="vp-event-card-top">
              <div className="vp-event-date-block is-past">
                <div className="vp-event-date-month">{ev.month}</div>
                <div className="vp-event-date-day">{ev.day}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="vp-event-title">{ev.title}</div>
                <div className="vp-event-meta">
                  <span className="vp-event-meta-item">⏰ {ev.time}</span>
                  <span className="vp-event-meta-item">📍 {ev.location}</span>
                </div>
              </div>
            </div>
            <div className="vp-event-desc">{ev.desc}</div>
            <div className="vp-event-footer">
              <div className="vp-past-badge">✓ Completed · {ev.hours}h</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────

function ProfileTab({ showToast }: { showToast: (msg: string) => void }) {
  const [form, setForm] = useState({ name: MOCK_VOLUNTEER.name, email: MOCK_VOLUNTEER.email, phone: MOCK_VOLUNTEER.phone });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPws, setShowPws] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setPw = (k: string) => (v: string) => setPwForm(f => ({ ...f, [k]: v }));

  const save = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast("✅ Profile saved!"); }, 900);
  };

  return (
    <div>
      <div className="vp-profile-hero vp-up">
        <div className="vp-profile-avatar-wrap">
          <div className="vp-profile-avatar">{MOCK_VOLUNTEER.initials}</div>
          <div className="vp-profile-avatar-edit" title="Change photo">✏️</div>
        </div>
        <div className="vp-profile-name">{form.name}</div>
        <div className="vp-profile-email">{form.email}</div>
        <div className="vp-profile-since">Volunteer since {MOCK_VOLUNTEER.since}</div>
      </div>

      <div className="vp-form-card vp-up-1">
        <div className="vp-form-card-title">Personal Information</div>
        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label">Full Name</label>
            <input className="vp-input" value={form.name} onChange={e => set("name")(e.target.value)} />
          </div>
          <div className="vp-field">
            <label className="vp-label">Phone (optional)</label>
            <input className="vp-input" value={form.phone} onChange={e => set("phone")(e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
        <div className="vp-field">
          <label className="vp-label">Email Address</label>
          <input className="vp-input" type="email" value={form.email} onChange={e => set("email")(e.target.value)} />
        </div>
        <button className="vp-btn vp-btn-sun" type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="vp-form-card vp-up-2">
        <div className="vp-form-card-title">Change Password</div>
        {(["current", "next", "confirm"] as const).map((k, i) => {
          const labels = ["Current Password", "New Password", "Confirm New Password"];
          const keys = { current: "current", next: "next", confirm: "confirm" };
          return (
            <div className="vp-field" key={k}>
              <label className="vp-label">{labels[i]}</label>
              <div className="vp-input-wrap">
                <input
                  className="vp-input"
                  type={showPws[k] ? "text" : "password"}
                  placeholder="••••••••"
                  value={pwForm[k]}
                  onChange={e => setPw(k)(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button className="vp-input-btn" type="button" onClick={() => setShowPws(s => ({ ...s, [k]: !s[k] }))}>
                  <EyeIcon open={showPws[k]} />
                </button>
              </div>
            </div>
          );
        })}
        <button className="vp-btn vp-btn-outline" type="button" onClick={() => showToast("✅ Password updated!")}>
          Update Password
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD SHELL ──────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [myEvents, setMyEvents] = useState<number[]>([1]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="vp-shell">
      <TopBar onLogout={onLogout} />
      <div className="vp-content">
        {tab === "home" && <HomeTab myEvents={myEvents} setTab={setTab} />}
        {tab === "events" && <EventsTab myEvents={myEvents} setMyEvents={setMyEvents} showToast={showToast} />}
        {tab === "myevents" && <MyEventsTab myEvents={myEvents} setMyEvents={setMyEvents} showToast={showToast} />}
        {tab === "profile" && <ProfileTab showToast={showToast} />}
      </div>
      <BottomNav tab={tab} setTab={setTab} myCount={myEvents.length} />
      {toast && <div className="vp-toast">{toast}</div>}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function VolunteerPortal() {
  const [authed, setAuthed] = useState(false);
  return (
    <div className="vp">
      <style>{styles}</style>
      {!authed
        ? <LoginPage onLogin={() => setAuthed(true)} />
        : <Dashboard onLogout={() => setAuthed(false)} />
      }
    </div>
  );
}
