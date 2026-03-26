import Head from 'next/head';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { ArrowRight, Heart, Users, Zap, Globe } from 'lucide-react';

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
  .about-page { background: #0a0f1e; min-height: 100vh; font-family: 'DM Sans', sans-serif; color: white; }
  .about-hero { padding: 140px 24px 80px; text-align: center; max-width: 780px; margin: 0 auto; }
  .about-section { max-width: 1040px; margin: 0 auto; padding: 64px 24px; }
  .about-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 0; }
  .value-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; }
`;

const VALUES = [
  { icon: Heart, title: 'Mission-first', body: 'We believe volunteer management software should help organizations focus on their mission, not their inbox.' },
  { icon: Users, title: 'Built for people', body: 'Every feature starts with the coordinator and the volunteer in mind — real workflows, real problems, real solutions.' },
  { icon: Zap, title: 'Simple by default', body: 'Powerful tools shouldn\'t require a manual. VolunteerFlow is designed to be intuitive from day one.' },
  { icon: Globe, title: 'Community impact', body: 'Every volunteer hour coordinated through VolunteerFlow is an hour spent on real impact. That ripple effect drives everything we build.' },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <Head>
        <title>About — VolunteerFlow</title>
        <meta name="description" content="Learn about VolunteerFlow — the volunteer management platform built for organizations that want to make a bigger impact." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      {/* Hero */}
      <div className="about-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#34d399', marginBottom: 28 }}>
          Our story
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 24 }}>
          Built to help organizations<br />
          <em style={{ fontStyle: 'italic', color: '#34d399' }}>do more good</em>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 36px' }}>
          VolunteerFlow started with a simple observation: nonprofits were spending more time managing spreadsheets than managing volunteers. We set out to fix that.
        </p>
        <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
          Start for free <ArrowRight style={{ width: 16, height: 16 }} />
        </a>
      </div>

      <hr className="about-divider" />

      {/* Mission */}
      <div className="about-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Our mission</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 700, lineHeight: 1.25, marginBottom: 20 }}>
              Every volunteer hour should go toward impact — not admin
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
              We build software that automates the operational burden of running a volunteer program — scheduling, reminders, communications, tracking — so your team can focus on the work that actually matters.
            </p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 20, padding: 40 }}>
            {[
              { stat: 'Free', label: '30-day trial — no card required' },
              { stat: '5 min', label: 'Average setup time' },
              { stat: '24/7', label: 'Support for every plan' },
            ].map(({ stat, label }, i, arr) => (
              <div key={stat} style={{ marginBottom: i < arr.length - 1 ? 32 : 0, paddingBottom: i < arr.length - 1 ? 32 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: '#34d399', fontFamily: 'Playfair Display, serif' }}>{stat}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="about-divider" />

      {/* Values */}
      <div className="about-section">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>What drives us</p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 700 }}>Our values</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="value-card">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Icon style={{ width: 22, height: 22, color: '#34d399' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <hr className="about-divider" />

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 700, marginBottom: 16 }}>
          Ready to make a bigger impact?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 36 }}>Start free and see what VolunteerFlow can do for your team.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
            Start free trial <ArrowRight style={{ width: 16, height: 16 }} />
          </a>
          <a href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
            Contact us
          </a>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
