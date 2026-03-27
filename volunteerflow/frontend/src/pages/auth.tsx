import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { api, ApiError } from "@/lib/api";
import { SignInModal } from "@/components/SignInModal";

// ─── ICONS ────────────────────────────────────────────────────────────────────

const HeartIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EyeIcon = ({ open = true, size = 18 }: { open?: boolean; size?: number }) =>
  open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .auth-page *, .auth-page *::before, .auth-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-page {
    --forest: #1a3a2a;
    --forest-mid: #2d5c42;
    --sage: #4a7c5f;
    --sage-light: #6ba583;
    --mint: #c8e6d4;
    --mint-pale: #f0f8f3;
    --cream: #faf8f4;
    --warm-white: #ffffff;
    --ink: #1c2b22;
    --ink-mid: #3d5247;
    --ink-soft: #6b8070;
    --border: #d4e4da;
    --border-focus: #4a7c5f;
    --gold: #c9923a;
    --gold-light: #f0c878;
    --error: #c0392b;
    --success: #2d7a4f;
    --success-bg: #f0f8f3;
    --shadow-sm: 0 1px 3px rgba(26,58,42,0.08);
    --shadow-md: 0 4px 16px rgba(26,58,42,0.10), 0 2px 6px rgba(26,58,42,0.06);
    --shadow-lg: 0 8px 32px rgba(26,58,42,0.13), 0 4px 12px rgba(26,58,42,0.07);
    --shadow-xl: 0 20px 60px rgba(26,58,42,0.18), 0 8px 24px rgba(26,58,42,0.10);
    --radius: 14px;
    --radius-sm: 8px;
    --radius-lg: 20px;
    --radius-xl: 28px;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    color: var(--ink);
  }

  /* ── SHELL ── */
  .auth-shell {
    min-height: 100vh; display: flex; position: relative;
    overflow: hidden; background: var(--cream);
  }

  /* ── LEFT PANEL ── */
  .auth-panel-left {
    width: 420px; min-width: 420px; background: var(--forest);
    display: flex; flex-direction: column; padding: 48px 44px;
    position: relative; overflow: hidden; flex-shrink: 0;
  }
  .auth-panel-left::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 20% 10%, rgba(106,165,131,0.22) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 90%, rgba(201,146,58,0.12) 0%, transparent 60%);
    pointer-events: none;
  }
  .panel-blob { position: absolute; border-radius: 50%; opacity: 0.07; pointer-events: none; }
  .panel-blob-1 { width: 320px; height: 320px; background: var(--sage-light); bottom: -60px; right: -80px; }
  .panel-blob-2 { width: 180px; height: 180px; background: var(--gold); top: 160px; left: -60px; }
  .panel-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; margin-bottom: 56px; position: relative; z-index: 1;
  }
  .panel-logo-img { width: 64px; height: 64px; flex-shrink: 0; }
  .panel-logo-text {
    font-family: 'Playfair Display', serif; color: var(--warm-white);
    font-size: 20px; font-weight: 600; letter-spacing: -0.3px;
  }
  .panel-headline {
    font-family: 'Playfair Display', serif; color: var(--warm-white);
    font-size: 36px; font-weight: 600; line-height: 1.2; letter-spacing: -0.5px;
    margin-bottom: 20px; position: relative; z-index: 1;
  }
  .panel-headline span { color: var(--gold-light); }
  .panel-desc {
    color: rgba(255,255,255,0.65); font-size: 15px; line-height: 1.65;
    margin-bottom: 48px; position: relative; z-index: 1;
  }
  .panel-stats { display: flex; flex-direction: column; gap: 16px; margin-top: auto; position: relative; z-index: 1; }
  .panel-stat {
    display: flex; align-items: center; gap: 14px;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.10);
    border-radius: var(--radius); padding: 16px 18px; backdrop-filter: blur(8px);
  }
  .panel-stat-icon {
    width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center;
    justify-content: center; background: rgba(255,255,255,0.10); color: var(--gold-light); flex-shrink: 0;
  }
  .panel-stat-label { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .panel-stat-value { color: var(--warm-white); font-size: 18px; font-weight: 600; font-family: 'Playfair Display', serif; }

  /* ── RIGHT PANEL ── */
  .auth-panel-right {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 48px 40px; overflow-y: auto; position: relative;
  }
  .auth-panel-right::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 80% 20%, rgba(106,165,131,0.06) 0%, transparent 55%);
    pointer-events: none;
  }
  .auth-card { width: 100%; max-width: 440px; position: relative; z-index: 1; }
  .auth-card-header { margin-bottom: 32px; }
  .auth-card-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--mint); color: var(--forest-mid); border-radius: 99px;
    padding: 5px 12px; font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
    text-transform: uppercase; margin-bottom: 14px;
  }
  .auth-card-title {
    font-family: 'Playfair Display', serif; font-size: 30px; font-weight: 600;
    color: var(--ink); letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 8px;
  }
  .auth-card-sub { color: var(--ink-soft); font-size: 15px; line-height: 1.55; }

  /* ── FORM ── */
  .auth-form-group { margin-bottom: 18px; }
  .auth-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .auth-form-label {
    display: block; font-size: 13px; font-weight: 600; color: var(--ink-mid);
    margin-bottom: 7px; letter-spacing: 0.1px;
  }
  .auth-input-wrap { position: relative; }
  .auth-input {
    width: 100%; padding: 12px 16px; border: 1.5px solid var(--border);
    border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif;
    font-size: 14.5px; color: var(--ink); background: var(--warm-white);
    transition: border-color 0.18s, box-shadow 0.18s; outline: none; appearance: none;
  }
  .auth-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(74,124,95,0.12); }
  .auth-input::placeholder { color: #aabcb4; }
  .auth-input.is-error { border-color: var(--error); box-shadow: 0 0 0 3px rgba(192,57,43,0.10); }
  .auth-input-icon-right {
    position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
    color: var(--ink-soft); cursor: pointer; background: none; border: none;
    padding: 4px; display: flex; align-items: center; justify-content: center;
  }
  .auth-field-error { color: var(--error); font-size: 12px; margin-top: 5px; font-weight: 500; }
  .auth-field-hint { color: var(--ink-soft); font-size: 12px; margin-top: 5px; }
  .auth-checkbox-row { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
  .auth-checkbox {
    width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border);
    background: var(--warm-white); flex-shrink: 0; display: flex; align-items: center;
    justify-content: center; transition: border-color 0.15s, background 0.15s;
    margin-top: 1px; cursor: pointer;
  }
  .auth-checkbox.is-checked { background: var(--forest); border-color: var(--forest); color: white; }
  .auth-checkbox-label { font-size: 13.5px; color: var(--ink-mid); line-height: 1.45; }
  .auth-checkbox-label a { color: var(--sage); text-decoration: underline; text-underline-offset: 2px; }
  .forgot-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
  .forgot-link {
    background: none; border: none; color: var(--sage); font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: 'DM Sans', sans-serif; padding: 0;
    text-decoration: underline; text-underline-offset: 2px;
  }

  /* ── BUTTONS ── */
  .auth-btn-primary {
    width: 100%; padding: 14px 24px; background: var(--forest); color: var(--warm-white);
    border: none; border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif;
    font-size: 15px; font-weight: 600; cursor: pointer;
    transition: background 0.18s, transform 0.1s, box-shadow 0.18s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 2px 8px rgba(26,58,42,0.20); letter-spacing: 0.1px;
  }
  .auth-btn-primary:hover { background: var(--forest-mid); box-shadow: 0 4px 16px rgba(26,58,42,0.28); transform: translateY(-1px); }
  .auth-btn-primary:active { transform: translateY(0); }
  .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .auth-switch { text-align: center; margin-top: 24px; font-size: 14px; color: var(--ink-soft); }
  .auth-switch button {
    background: none; border: none; color: var(--sage); font-weight: 600;
    cursor: pointer; font-size: 14px; font-family: 'DM Sans', sans-serif;
    padding: 0; text-decoration: underline; text-underline-offset: 2px;
  }

  /* ── LANDING ── */
  .landing-shell {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--cream); position: relative; overflow: hidden; padding: 40px 24px;
  }
  .landing-bg-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55; pointer-events: none; }
  .landing-bg-blob-1 { width: 600px; height: 600px; background: var(--mint); top: -200px; right: -100px; }
  .landing-bg-blob-2 { width: 400px; height: 400px; background: rgba(201,146,58,0.18); bottom: -100px; left: -80px; }
  .landing-bg-blob-3 { width: 300px; height: 300px; background: rgba(74,124,95,0.12); top: 40%; left: 20%; }
  .landing-card {
    background: var(--warm-white); border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl); border: 1px solid rgba(212,228,218,0.6);
    max-width: 540px; width: 100%; padding: 56px 52px; position: relative; z-index: 1; text-align: center;
  }
  .landing-badge {
    display: inline-flex; align-items: center; gap: 6px; background: var(--mint);
    color: var(--forest-mid); border-radius: 99px; padding: 6px 14px; font-size: 12px;
    font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 28px;
  }
  .landing-logo-mark {
    width: 68px; height: 68px; background: linear-gradient(135deg, var(--forest), var(--sage));
    border-radius: 18px; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px; box-shadow: 0 8px 24px rgba(26,58,42,0.25); color: var(--mint);
  }
  .landing-title {
    font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 700;
    color: var(--ink); letter-spacing: -0.8px; line-height: 1.15; margin-bottom: 14px;
  }
  .landing-title span { color: var(--sage); }
  .landing-desc { color: var(--ink-soft); font-size: 16px; line-height: 1.65; margin-bottom: 40px; }
  .landing-btns { display: flex; flex-direction: column; gap: 12px; }
  .btn-landing-primary {
    padding: 15px 32px; background: var(--forest); color: white; border: none;
    border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 16px;
    font-weight: 600; cursor: pointer; transition: background 0.18s, transform 0.1s, box-shadow 0.18s;
    box-shadow: 0 4px 16px rgba(26,58,42,0.25);
  }
  .btn-landing-primary:hover { background: var(--forest-mid); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,58,42,0.30); }
  .btn-landing-secondary {
    padding: 15px 32px; background: transparent; color: var(--forest);
    border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer;
    transition: border-color 0.18s, background 0.18s;
  }
  .btn-landing-secondary:hover { border-color: var(--sage); background: var(--mint-pale); }
  .landing-trust {
    display: flex; align-items: center; justify-content: center; gap: 20px;
    margin-top: 32px; padding-top: 28px; border-top: 1px solid var(--border); flex-wrap: wrap;
  }
  .trust-item { display: flex; align-items: center; gap: 6px; color: var(--ink-soft); font-size: 13px; font-weight: 500; }
  .trust-item svg { color: var(--sage); }

  /* ── PRICING ── */
  .pricing-shell {
    min-height: 100vh; background: var(--cream); padding: 60px 24px; position: relative; overflow: hidden;
  }
  .pricing-shell::before {
    content: ''; position: absolute; top: -200px; right: -150px; width: 500px; height: 500px;
    border-radius: 50%; background: radial-gradient(circle, var(--mint) 0%, transparent 70%);
    opacity: 0.6; pointer-events: none;
  }
  .pricing-header { text-align: center; margin-bottom: 48px; position: relative; z-index: 1; }
  .pricing-eyebrow {
    display: inline-flex; align-items: center; gap: 6px; background: var(--mint);
    color: var(--forest-mid); border-radius: 99px; padding: 6px 14px; font-size: 12px;
    font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 16px;
  }
  .pricing-title {
    font-family: 'Playfair Display', serif; font-size: 40px; font-weight: 700;
    color: var(--ink); letter-spacing: -0.8px; line-height: 1.15; margin-bottom: 12px;
  }
  .pricing-sub { color: var(--ink-soft); font-size: 16px; max-width: 500px; margin: 0 auto; line-height: 1.6; }
  .pricing-toggle-wrap {
    display: flex; align-items: center; justify-content: center; gap: 14px;
    margin-bottom: 48px; position: relative; z-index: 1;
  }
  .toggle-label { font-size: 14px; font-weight: 600; color: var(--ink-mid); }
  .toggle-label.is-active { color: var(--forest); }
  .toggle-switch {
    width: 52px; height: 28px; background: var(--border); border-radius: 99px;
    position: relative; cursor: pointer; transition: background 0.2s; border: none; outline: none;
  }
  .toggle-switch.is-on { background: var(--forest); }
  .toggle-knob {
    position: absolute; width: 22px; height: 22px; background: white; border-radius: 50%;
    top: 3px; left: 3px; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }
  .toggle-switch.is-on .toggle-knob { transform: translateX(24px); }
  .toggle-badge {
    background: var(--gold); color: white; font-size: 11px; font-weight: 700;
    border-radius: 99px; padding: 3px 9px; letter-spacing: 0.3px; text-transform: uppercase;
  }
  .pricing-cards {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px; max-width: 780px; margin: 0 auto 40px; position: relative; z-index: 1;
  }
  .pricing-card {
    background: var(--warm-white); border-radius: var(--radius-lg); border: 1.5px solid var(--border);
    padding: 36px 32px; box-shadow: var(--shadow-md); transition: transform 0.2s, box-shadow 0.2s; position: relative;
  }
  .pricing-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
  .pricing-card.is-featured {
    border-color: var(--forest); background: var(--forest);
    box-shadow: 0 12px 40px rgba(26,58,42,0.25), 0 4px 12px rgba(26,58,42,0.15);
  }
  .pricing-card.is-featured:hover { box-shadow: 0 20px 56px rgba(26,58,42,0.30); }
  .featured-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, var(--gold), #e8a84a); color: white;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    border-radius: 99px; padding: 5px 16px; box-shadow: 0 2px 8px rgba(201,146,58,0.35); white-space: nowrap;
  }
  .card-plan { font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 10px; }
  .card-plan.is-light { color: var(--sage); }
  .card-plan.is-dark { color: var(--gold-light); }
  .card-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
  .card-price { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700; line-height: 1; }
  .card-price.is-light { color: var(--ink); }
  .card-price.is-dark { color: white; }
  .card-price-per { font-size: 14px; font-weight: 500; }
  .card-price-per.is-light { color: var(--ink-soft); }
  .card-price-per.is-dark { color: rgba(255,255,255,0.55); }
  .card-price-annual { font-size: 12.5px; font-weight: 500; margin-bottom: 16px; padding: 4px 10px; border-radius: 6px; display: inline-block; }
  .card-price-annual.is-light { color: var(--success); background: var(--success-bg); }
  .card-price-annual.is-dark { color: var(--gold-light); background: rgba(240,200,120,0.12); }
  .card-desc { font-size: 14px; line-height: 1.55; margin-bottom: 24px; padding-bottom: 24px; }
  .card-desc.is-light { color: var(--ink-soft); border-bottom: 1px solid var(--border); }
  .card-desc.is-dark { color: rgba(255,255,255,0.62); border-bottom: 1px solid rgba(255,255,255,0.12); }
  .card-features { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .card-feature { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; }
  .card-feature.is-light { color: var(--ink-mid); }
  .card-feature.is-dark { color: rgba(255,255,255,0.80); }
  .feature-check { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .feature-check.is-light { background: var(--mint); color: var(--forest); }
  .feature-check.is-dark { background: rgba(200,230,212,0.15); color: var(--gold-light); }
  .btn-plan-light {
    width: 100%; padding: 13px 24px; background: var(--forest); color: white; border: none;
    border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 15px;
    font-weight: 600; cursor: pointer; transition: background 0.18s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(26,58,42,0.18);
  }
  .btn-plan-light:hover { background: var(--forest-mid); transform: translateY(-1px); }
  .btn-plan-light:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .btn-plan-dark {
    width: 100%; padding: 13px 24px; background: white; color: var(--forest); border: none;
    border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 15px;
    font-weight: 600; cursor: pointer; transition: background 0.18s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .btn-plan-dark:hover { background: var(--mint); transform: translateY(-1px); }
  .btn-plan-dark:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .pricing-comparison {
    max-width: 780px; margin: 0 auto; background: var(--warm-white); border: 1.5px solid var(--border);
    border-radius: var(--radius); padding: 28px 32px; position: relative; z-index: 1; box-shadow: var(--shadow-sm);
  }
  .comparison-title { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 16px; }
  .comparison-row { display: grid; grid-template-columns: 1fr 100px 100px; gap: 12px; align-items: center; padding: 10px 0; }
  .comparison-row:not(:last-child) { border-bottom: 1px solid var(--border); }
  .comp-feature { font-size: 13.5px; color: var(--ink-mid); }
  .comp-val { text-align: center; font-size: 13px; font-weight: 600; }
  .comp-val.is-yes { color: var(--success); }
  .comp-val.is-no { color: #bbb; }
  .comp-val.is-amt { color: var(--ink-mid); }
  .comp-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--ink-soft); text-align: center; }

  /* ── WELCOME ── */
  .welcome-shell {
    min-height: 100vh; background: var(--cream); display: flex; align-items: center;
    justify-content: center; padding: 40px 24px; position: relative; overflow: hidden;
  }
  .welcome-shell::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 60% 0%, rgba(200,230,212,0.35) 0%, transparent 55%);
    pointer-events: none;
  }
  .welcome-card {
    background: var(--warm-white); border-radius: var(--radius-xl); border: 1px solid var(--border);
    box-shadow: var(--shadow-xl); max-width: 600px; width: 100%; padding: 60px 56px;
    text-align: center; position: relative; z-index: 1; overflow: hidden;
  }
  .welcome-card::before {
    content: ''; position: absolute; top: -60px; left: -60px; width: 200px; height: 200px;
    border-radius: 50%; background: radial-gradient(circle, var(--mint) 0%, transparent 70%);
    opacity: 0.5; pointer-events: none;
  }
  .welcome-icon {
    width: 76px; height: 76px; background: linear-gradient(135deg, var(--forest), var(--sage));
    border-radius: 22px; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px; box-shadow: 0 8px 28px rgba(26,58,42,0.25); color: var(--mint); position: relative; z-index: 1;
  }
  .confetti-ring {
    position: absolute; inset: -16px; border-radius: 50%;
    border: 2px dashed rgba(200,230,212,0.5); animation: vf-spin 20s linear infinite;
  }
  @keyframes vf-spin { to { transform: rotate(360deg); } }
  .welcome-title {
    font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700;
    color: var(--ink); letter-spacing: -0.6px; line-height: 1.2; margin-bottom: 10px; position: relative; z-index: 1;
  }
  .welcome-sub { color: var(--ink-soft); font-size: 16px; line-height: 1.6; margin-bottom: 36px; position: relative; z-index: 1; }
  .welcome-plan-badge {
    display: inline-flex; align-items: center; gap: 8px; background: var(--mint);
    color: var(--forest-mid); border-radius: var(--radius-sm); padding: 10px 18px;
    font-size: 14px; font-weight: 600; margin-bottom: 36px; position: relative; z-index: 1;
  }
  .welcome-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 32px; position: relative; z-index: 1; }
  .welcome-step { background: var(--mint-pale); border: 1px solid var(--mint); border-radius: var(--radius); padding: 18px 12px; text-align: center; }
  .welcome-step-num {
    width: 28px; height: 28px; background: var(--forest); color: white; border-radius: 50%;
    font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px;
  }
  .welcome-step-label { font-size: 12.5px; font-weight: 600; color: var(--ink-mid); }
  .welcome-step-hint { font-size: 11px; color: var(--ink-soft); margin-top: 3px; }

  /* ── PROGRESS BAR ── */
  .progress-bar-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 32px; }
  .progress-step { display: flex; align-items: center; gap: 8px; }
  .progress-dot {
    width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center; font-size: 13px;
    font-weight: 600; color: var(--ink-soft); background: var(--warm-white); flex-shrink: 0; transition: all 0.2s;
  }
  .progress-dot.is-active { border-color: var(--forest); background: var(--forest); color: white; }
  .progress-dot.is-done { border-color: var(--sage); background: var(--sage); color: white; }
  .progress-line { width: 32px; height: 2px; background: var(--border); transition: background 0.2s; }
  .progress-line.is-done { background: var(--sage); }
  .progress-label { font-size: 11px; color: var(--ink-soft); margin-top: 4px; text-align: center; white-space: nowrap; }

  /* ── ANIMATIONS ── */
  @keyframes vf-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .vf-fade-up { animation: vf-fadeUp 0.4s ease both; }
  .vf-fade-up-delay { animation: vf-fadeUp 0.4s ease 0.1s both; }

  /* ── RESPONSIVE ── */
  @media (max-width: 860px) { .auth-panel-left { display: none; } }
  @media (max-width: 600px) {
    .landing-card { padding: 36px 28px; }
    .pricing-title { font-size: 30px; }
    .pricing-cards { grid-template-columns: 1fr; }
    .auth-form-row { grid-template-columns: 1fr; }
    .welcome-card { padding: 40px 28px; }
    .welcome-steps { grid-template-columns: 1fr; }
    .auth-panel-right { padding: 32px 24px; }
    .comparison-row { grid-template-columns: 1fr 80px 80px; }
  }
`;

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Screen = "landing" | "signin" | "signup" | "pricing" | "welcome";
type PlanKey = "discover" | "grow";

interface FormErrors {
  [key: string]: string;
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const steps = ["Sign Up", "Choose Plan", "Dashboard"];
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="progress-bar-wrap">
        {steps.map((label, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          return (
            <div className="progress-step" key={i}>
              <div style={{ textAlign: "center" }}>
                <div className={`progress-dot${done ? " is-done" : active ? " is-active" : ""}`}>
                  {done ? <CheckIcon size={14} /> : idx}
                </div>
                <div className="progress-label">{label}</div>
              </div>
              {i < steps.length - 1 && (
                <div className={`progress-line${done ? " is-done" : ""}`} style={{ marginBottom: 14 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

interface FormFieldProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  hint?: string;
  rightEl?: React.ReactNode;
}

function FormField({ label, type = "text", placeholder, value, onChange, error, hint, rightEl }: FormFieldProps) {
  return (
    <div className="auth-form-group">
      {label && <label className="auth-form-label">{label}</label>}
      <div className="auth-input-wrap">
        <input
          className={`auth-input${error ? " is-error" : ""}`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingRight: rightEl ? 44 : 16 }}
        />
        {rightEl && <div className="auth-input-icon-right">{rightEl}</div>}
      </div>
      {error && <div className="auth-field-error">{error}</div>}
      {hint && !error && <div className="auth-field-hint">{hint}</div>}
    </div>
  );
}

// ─── LANDING ─────────────────────────────────────────────────────────────────

function LandingPage({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="landing-shell">
      <div className="landing-bg-blob landing-bg-blob-1" />
      <div className="landing-bg-blob landing-bg-blob-2" />
      <div className="landing-bg-blob landing-bg-blob-3" />
      <div className="landing-card vf-fade-up">
        <div className="landing-badge"><HeartIcon size={12} /> Nonprofit Platform</div>
        <div className="landing-logo-mark"><HeartIcon size={30} /></div>
        <h1 className="landing-title">Volunteer<span>Flow</span></h1>
        <p className="landing-desc">
          The all-in-one platform for nonprofits to manage volunteers, coordinate events, and grow their mission with ease.
        </p>
        <div className="landing-btns">
          <button className="btn-landing-primary" onClick={onSignUp}>Get Started Free →</button>
          <button className="btn-landing-secondary" onClick={onSignIn}>Sign In to Your Account</button>
        </div>
        <div className="landing-trust">
          <div className="trust-item"><CheckIcon size={14} /> Free 30-day trial</div>
          <div className="trust-item"><CheckIcon size={14} /> No credit card required</div>
          <div className="trust-item"><CheckIcon size={14} /> No commitment needed</div>
        </div>
      </div>
    </div>
  );
}

// ─── SIGN IN ──────────────────────────────────────────────────────────────────

function SignInPage({ onSuccess, onGoSignUp }: { onSuccess: () => void; onGoSignUp: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Please enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: { email: string; fullName: string; orgName: string; role: string } }>(
        '/auth/login', { email, password }
      );
      sessionStorage.setItem('vf_token', data.token);
      sessionStorage.setItem('vf_user', JSON.stringify({ email: data.user.email, name: data.user.fullName, orgName: data.user.orgName }));
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel-left">
        <div className="panel-blob panel-blob-1" />
        <div className="panel-blob panel-blob-2" />
        <div className="panel-logo">
          <img src="/vf-logo.png" className="panel-logo-img" alt="" aria-hidden="true" />
          <span className="panel-logo-text">VolunteerFlow</span>
        </div>
        <h2 className="panel-headline">Welcome<br />back to your <span>mission.</span></h2>
        <p className="panel-desc">Sign in and continue making a difference. Your volunteers and events are waiting for you.</p>
        <div className="panel-stats">
          {[
            { value: "Free", label: "30-day trial included" },
            { value: "5 min", label: "Average setup time" },
            { value: "24/7", label: "Support for every plan" },
          ].map(s => (
            <div className="panel-stat" key={s.label}>
              <div className="panel-stat-icon"><HeartIcon size={16} /></div>
              <div>
                <div className="panel-stat-value">{s.value}</div>
                <div className="panel-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-panel-right">
        <div className="auth-card vf-fade-up">
          <div className="auth-card-header">
            <div className="auth-card-eyebrow"><HeartIcon size={12} /> Returning User</div>
            <h1 className="auth-card-title">Sign in to your account</h1>
            <p className="auth-card-sub">Enter your credentials to access your nonprofit dashboard.</p>
          </div>
          <FormField label="Email Address" type="email" placeholder="you@nonprofit.org" value={email} onChange={setEmail} error={errors.email} />
          <div className="auth-form-group">
            <div className="forgot-row">
              <label className="auth-form-label" style={{ margin: 0 }}>Password</label>
              <button className="forgot-link" type="button" onClick={() => setForgotMsg('Check your email for a password reset link.')}>Forgot password?</button>
            </div>
            {forgotMsg && <p role="status" className="auth-field-hint" style={{ color: 'var(--success-600, #16a34a)', fontSize: 12, marginBottom: 4 }}>{forgotMsg}</p>}
            <div className="auth-input-wrap">
              <input
                className={`auth-input${errors.password ? " is-error" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button className="auth-input-icon-right" type="button" onClick={() => setShowPw(v => !v)}>
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password && <div className="auth-field-error">{errors.password}</div>}
          </div>
          <div className="auth-form-group">
            <label className="auth-checkbox-row" onClick={() => setRemember(v => !v)}>
              <div className={`auth-checkbox${remember ? " is-checked" : ""}`}>
                {remember && <CheckIcon size={11} />}
              </div>
              <span className="auth-checkbox-label">Keep me signed in for 30 days</span>
            </label>
          </div>
          {errors.general && <div className="auth-field-error" style={{ marginBottom: 12 }}>{errors.general}</div>}
          <button className="auth-btn-primary" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
          <div className="auth-switch">
            New to VolunteerFlow?{" "}
            <button type="button" onClick={onGoSignUp}>Create a free account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIGN UP ──────────────────────────────────────────────────────────────────

function SignUpPage({ onSuccess, onGoSignIn }: { onSuccess: () => void; onGoSignIn: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", birthday: "", orgName: "", password: "", confirmPassword: "" });
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Please enter a valid email";
    if (!form.birthday) e.birthday = "Birthday is required";
    if (!form.orgName.trim()) e.orgName = "Nonprofit name is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!agreed) e.agreed = "You must agree to continue";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: { email: string; fullName: string; role: string } }>(
        '/auth/register', { fullName: form.fullName, email: form.email, password: form.password, orgName: form.orgName }
      );
      sessionStorage.setItem('vf_token', data.token);
      sessionStorage.setItem('vf_user', JSON.stringify({ email: data.user.email, name: data.user.fullName }));
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = (p: string) => {
    if (!p) return null;
    if (p.length < 6) return { label: "Weak", color: "#c0392b" };
    if (p.length < 10 || !/[0-9]/.test(p)) return { label: "Fair", color: "#d97706" };
    return { label: "Strong", color: "#16a34a" };
  };
  const strength = pwStrength(form.password);

  return (
    <div className="auth-shell">
      <div className="auth-panel-left">
        <div className="panel-blob panel-blob-1" />
        <div className="panel-blob panel-blob-2" />
        <div className="panel-logo">
          <img src="/vf-logo.png" className="panel-logo-img" alt="" aria-hidden="true" />
          <span className="panel-logo-text">VolunteerFlow</span>
        </div>
        <h2 className="panel-headline">Start coordinating volunteers<br /><span>from day one.</span></h2>
        <p className="panel-desc">Create your account in under two minutes and start coordinating volunteers, events, and applications from day one.</p>
        <div className="panel-stats">
          {[
            { value: "Free", label: "30-day trial included" },
            { value: "5 min", label: "Average setup time" },
            { value: "24/7", label: "Support available" },
          ].map(s => (
            <div className="panel-stat" key={s.label}>
              <div className="panel-stat-icon"><HeartIcon size={16} /></div>
              <div>
                <div className="panel-stat-value">{s.value}</div>
                <div className="panel-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-panel-right">
        <div className="auth-card vf-fade-up">
          <div className="auth-card-header">
            <div className="auth-card-eyebrow"><HeartIcon size={12} /> Create Your Account</div>
            <h1 className="auth-card-title">Start your free trial</h1>
            <p className="auth-card-sub">30-day free trial. No credit card required.</p>
          </div>
          <ProgressBar step={1} />
          <div className="auth-form-row">
            <FormField label="Full Name" placeholder="Jane Smith" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
            <FormField label="Date of Birth" type="date" value={form.birthday} onChange={set("birthday")} error={errors.birthday} />
          </div>
          <FormField label="Email Address" type="email" placeholder="you@nonprofit.org" value={form.email} onChange={set("email")} error={errors.email} />
          <FormField label="Nonprofit Name" placeholder="e.g. Green Future Foundation" value={form.orgName} onChange={set("orgName")} error={errors.orgName} hint="This is how your organization will appear on the platform" />
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label className="auth-form-label">Password</label>
              <div className="auth-input-wrap">
                <input
                  className={`auth-input${errors.password ? " is-error" : ""}`}
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => set("password")(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button className="auth-input-icon-right" type="button" onClick={() => setShowPw(v => !v)}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {strength && !errors.password && <div className="auth-field-hint" style={{ color: strength.color, fontWeight: 600 }}>{strength.label} password</div>}
              {errors.password && <div className="auth-field-error">{errors.password}</div>}
            </div>
            <div className="auth-form-group">
              <label className="auth-form-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <input
                  className={`auth-input${errors.confirmPassword ? " is-error" : ""}`}
                  type={showCpw ? "text" : "password"}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => set("confirmPassword")(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button className="auth-input-icon-right" type="button" onClick={() => setShowCpw(v => !v)}>
                  <EyeIcon open={showCpw} />
                </button>
              </div>
              {errors.confirmPassword && <div className="auth-field-error">{errors.confirmPassword}</div>}
            </div>
          </div>
          <div className="auth-form-group">
            <label className="auth-checkbox-row" onClick={() => setAgreed(v => !v)}>
              <div className={`auth-checkbox${agreed ? " is-checked" : ""}`}>
                {agreed && <CheckIcon size={11} />}
              </div>
              <span className="auth-checkbox-label">
                I agree to VolunteerFlow's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </span>
            </label>
            {errors.agreed && <div className="auth-field-error" style={{ marginTop: 8 }}>{errors.agreed}</div>}
          </div>
          <button className="auth-btn-primary" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating account…" : "Continue to Plan Selection →"}
          </button>
          <div className="auth-switch">
            Already have an account?{" "}
            <button type="button" onClick={onGoSignIn}>Sign in here</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────

const PLANS = {
  discover: {
    name: "Discover", monthly: 49, yearly: 41,
    desc: "Everything you need to launch your volunteer program and start making an impact.",
    features: ["2 admin seats", "Unlimited volunteers & events", "Email & SMS messaging", "10,000 SMS / year", "Automated reminders & templates", "CSV export & mobile-friendly"],
  },
  grow: {
    name: "Grow", monthly: 149, yearly: 124,
    desc: "Advanced tools for growing nonprofits ready to professionalize their volunteer operations.",
    features: ["10 admin seats", "50,000 SMS / year", "Custom design & branding", "Group registration", "Applicant vetting workflows", "Hours & attendance tracking", "File library & data import", "Job permissions"],
  },
};

function PricingProgressBar() {
  const steps = ["Sign Up", "Choose Plan", "Dashboard"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 36 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = 2 > idx;
        const active = 2 === idx;
        return (
          <div className="progress-step" key={i}>
            <div style={{ textAlign: "center" }}>
              <div className={`progress-dot${done ? " is-done" : active ? " is-active" : ""}`}>
                {done ? <CheckIcon size={14} /> : idx}
              </div>
              <div className="progress-label">{label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`progress-line${done ? " is-done" : ""}`} style={{ marginBottom: 14 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PricingPage({ onChoosePlan }: { onChoosePlan: (plan: PlanKey, yearly: boolean) => void }) {
  const [yearly, setYearly] = useState(false);
  const [selected, setSelected] = useState<PlanKey | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleChoose = (plan: PlanKey) => {
    setSelected(plan);
    setConfirming(true);
    setTimeout(() => { onChoosePlan(plan, yearly); }, 1000);
  };

  const price = (plan: PlanKey) => yearly ? PLANS[plan].yearly : PLANS[plan].monthly;
  const save = (plan: PlanKey) => Math.round((1 - PLANS[plan].yearly / PLANS[plan].monthly) * 100);

  return (
    <div className="pricing-shell">
      <div className="pricing-header vf-fade-up">
        <div className="pricing-eyebrow"><HeartIcon size={12} /> Step 2 of 3</div>
        <h1 className="pricing-title">Choose your plan</h1>
        <p className="pricing-sub">Start with a 30-day free trial. No credit card needed.</p>
      </div>
      <PricingProgressBar />
      <div className="pricing-toggle-wrap vf-fade-up-delay">
        <span className={`toggle-label${!yearly ? " is-active" : ""}`}>Pay Monthly</span>
        <button className={`toggle-switch${yearly ? " is-on" : ""}`} type="button" onClick={() => setYearly(v => !v)}>
          <div className="toggle-knob" />
        </button>
        <span className={`toggle-label${yearly ? " is-active" : ""}`}>Pay Yearly</span>
        {yearly && <span className="toggle-badge">Save up to 30%</span>}
      </div>
      <div className="pricing-cards vf-fade-up-delay">
        <div className="pricing-card">
          <div className="card-plan is-light">{PLANS.discover.name}</div>
          <div className="card-price-row">
            <span className="card-price is-light">${price("discover")}</span>
            <span className="card-price-per is-light">/mo</span>
          </div>
          {yearly ? <div className="card-price-annual is-light">Save {save("discover")}% vs monthly</div> : <div style={{ height: 24 }} />}
          <p className="card-desc is-light">{PLANS.discover.desc}</p>
          <div className="card-features">
            {PLANS.discover.features.map(f => (
              <div className="card-feature is-light" key={f}>
                <div className="feature-check is-light"><CheckIcon size={10} /></div>
                {f}
              </div>
            ))}
          </div>
          <button className="btn-plan-light" type="button" onClick={() => handleChoose("discover")} disabled={confirming}>
            {confirming && selected === "discover" ? "Confirming…" : "Choose Discover"}
          </button>
        </div>
        <div className="pricing-card is-featured">
          <div className="featured-badge">⭐ Most Popular</div>
          <div className="card-plan is-dark">{PLANS.grow.name}</div>
          <div className="card-price-row">
            <span className="card-price is-dark">${price("grow")}</span>
            <span className="card-price-per is-dark">/mo</span>
          </div>
          {yearly ? <div className="card-price-annual is-dark">Save {save("grow")}% vs monthly</div> : <div style={{ height: 24 }} />}
          <p className="card-desc is-dark">{PLANS.grow.desc}</p>
          <div className="card-features">
            {PLANS.grow.features.map(f => (
              <div className="card-feature is-dark" key={f}>
                <div className="feature-check is-dark"><CheckIcon size={10} /></div>
                {f}
              </div>
            ))}
          </div>
          <button className="btn-plan-dark" type="button" onClick={() => handleChoose("grow")} disabled={confirming}>
            {confirming && selected === "grow" ? "Confirming…" : "Choose Grow"}
          </button>
        </div>
      </div>
      <div className="pricing-comparison vf-fade-up-delay">
        <div className="comparison-title">Plan comparison</div>
        <div className="comparison-row">
          <div />
          <div className="comp-header">Discover</div>
          <div className="comp-header">Grow</div>
        </div>
        {[
          ["Admin seats", "2", "10"],
          ["Active volunteers", "Unlimited", "Unlimited"],
          ["SMS credits / year", "10,000", "50,000"],
          ["Custom branding", "no", "yes"],
          ["Group registration", "no", "yes"],
          ["Hours & attendance tracking", "no", "yes"],
          ["Applicant vetting", "no", "yes"],
          ["Data import", "no", "yes"],
        ].map(([feat, discover, grow]) => (
          <div className="comparison-row" key={feat}>
            <div className="comp-feature">{feat}</div>
            <div className={`comp-val ${discover === "yes" ? "is-yes" : discover === "no" ? "is-no" : "is-amt"}`}>
              {discover === "yes" ? "✓" : discover === "no" ? "—" : discover}
            </div>
            <div className={`comp-val ${grow === "yes" ? "is-yes" : grow === "no" ? "is-no" : "is-amt"}`}>
              {grow === "yes" ? "✓" : grow === "no" ? "—" : grow}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 48 }} />
    </div>
  );
}

// ─── DASHBOARD WELCOME ────────────────────────────────────────────────────────

function DashboardWelcome({ plan, yearly, onEnter }: { plan: PlanKey; yearly: boolean; onEnter: () => void }) {
  const planName = plan === "grow" ? "Grow" : "Discover";
  const billing = yearly ? "yearly" : "monthly";
  return (
    <div className="welcome-shell">
      <div className="welcome-card vf-fade-up">
        <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
          <div className="confetti-ring" />
          <div className="welcome-icon"><HeartIcon size={34} /></div>
        </div>
        <h1 className="welcome-title">Welcome to your dashboard!</h1>
        <p className="welcome-sub">
          Your VolunteerFlow workspace is all set. You're ready to start managing your nonprofit volunteers, events, and applications.
        </p>
        <div className="welcome-plan-badge">
          <CheckIcon size={15} />
          {planName} Plan · Billed {billing} · 30-day free trial active
        </div>
        <div className="welcome-steps">
          {[
            { num: 1, label: "Add Volunteers", hint: "Import or invite your team" },
            { num: 2, label: "Create an Event", hint: "Schedule your first opportunity" },
            { num: 3, label: "Go Live", hint: "Share your application link" },
          ].map(s => (
            <div className="welcome-step" key={s.num}>
              <div className="welcome-step-num">{s.num}</div>
              <div className="welcome-step-label">{s.label}</div>
              <div className="welcome-step-hint">{s.hint}</div>
            </div>
          ))}
        </div>
        <button className="auth-btn-primary" type="button" style={{ maxWidth: 320, margin: "0 auto" }} onClick={onEnter}>
          Go to Dashboard →
        </button>
        <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-soft)" }}>
          Need help?{" "}
          <a href="#" style={{ color: "var(--sage)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>
            View our getting started guide
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("landing");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("discover");
  const [yearly, setYearly] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  // Auto-open sign-in modal when redirected here with ?mode=signin (e.g. from 401 handler)
  useEffect(() => {
    if (router.isReady && router.query.mode === "signin") {
      setSignInOpen(true);
      // Remove ?mode=signin so re-renders / back-navigation don't re-open the modal
      const { mode: _mode, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.isReady, router.query.mode]);

  const handleAuthSuccess = () => {
    router.push("/");
  };

  return (
    <div className="auth-page">
      <Head>
        <title>VolunteerFlow</title>
        <meta name="description" content="Manage volunteers, events, and applications with VolunteerFlow." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      {screen === "landing" && (
        <LandingPage
          onSignIn={() => setSignInOpen(true)}
          onSignUp={() => setScreen("signup")}
        />
      )}
      {screen === "signup" && (
        <SignUpPage
          onSuccess={() => setScreen("pricing")}
          onGoSignIn={() => setSignInOpen(true)}
        />
      )}
      {screen === "pricing" && (
        <PricingPage
          onChoosePlan={(plan, y) => {
            setSelectedPlan(plan);
            setYearly(y);
            setScreen("welcome");
          }}
        />
      )}
      {screen === "welcome" && (
        <DashboardWelcome
          plan={selectedPlan}
          yearly={yearly}
          onEnter={handleAuthSuccess}
        />
      )}
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
